"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/profile";
import { getSiteUrl } from "@/lib/site-url";
import type { ProfileRole } from "@/lib/types/database";

export type InviteUserState = {
  error?: string;
  invited?: string;
  /** True when the account was created with a password set right here
   * (no email involved) — the invite-form success screen reads this to
   * show a different message than the emailed-invite case. */
  passwordSet?: boolean;
};

/**
 * Creates the account. Two ways in, chosen by whether the admin typed a
 * password:
 *
 * - Password given: creates the account directly with that password via
 *   the admin API (`email_confirm: true`, no email sent at all). The
 *   admin is responsible for getting the password to the person
 *   out-of-band (tell them in person, message it, etc). This exists
 *   because the emailed-invite link is a bad fit for same-day door
 *   staff — see DECISIONS.md, 2026-10-10 "Admin-set passwords" entry.
 * - No password: falls back to the original emailed-invite flow —
 *   accepting the link (app/auth/callback -> set-password) is this
 *   app's email-verification step.
 *
 * No self-service signup exists anymore (see DECISIONS.md, 2026-10-10)
 * — every account starts here, one way or the other.
 */
export async function inviteUser(
  _prevState: InviteUserState,
  formData: FormData,
): Promise<InviteUserState> {
  const supabase = await createClient();
  await requireRole(supabase, "admin");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "") as ProfileRole;
  const password = String(formData.get("password") ?? "");

  if (!email) return { error: "Enter an email address." };
  if (!["admin", "customer", "scanner"].includes(role)) {
    return { error: "Choose a role." };
  }
  if (password && password.length < 8) {
    return { error: "Password must be at least 8 characters, or leave it blank to email an invite instead." };
  }

  const admin = createAdminClient();

  let userId: string;
  if (password) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) return { error: error.message };
    if (!data.user) return { error: "Account creation didn't return a user — try again." };
    userId = data.user.id;
  } else {
    const siteUrl = await getSiteUrl();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/auth/callback`,
    });
    if (error) return { error: error.message };
    if (!data.user) return { error: "Invite sent, but no user record came back — try again." };
    userId = data.user.id;
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    email,
    role,
    full_name: fullName || null,
  });

  if (profileError) {
    return { error: `Account created, but couldn't save their role: ${profileError.message}` };
  }

  revalidatePath("/admin/users");
  return { invited: email, passwordSet: Boolean(password) };
}

export type SetUserPasswordState = {
  error?: string;
  success?: boolean;
};

/**
 * Lets the admin set/reset any account's password directly — there's no
 * "forgot password" self-service flow (no self-service anything, per
 * decision 5.8), so this is also how an admin recovers someone who's
 * locked out. Passwords are hashed by Supabase Auth and never readable
 * back out; this only ever writes a new one.
 */
export async function setUserPassword(
  userId: string,
  _prevState: SetUserPasswordState,
  formData: FormData,
): Promise<SetUserPasswordState> {
  const supabase = await createClient();
  await requireRole(supabase, "admin");

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords don't match." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export type AssignUserState = {
  error?: string;
};

/**
 * Assigns an existing account (looked up by email) to an event. If no
 * account exists yet for that email, this fails with a clear message
 * telling the admin to invite them first (as a 'customer' or 'scanner')
 * rather than silently creating one — inviteUser is the only place a
 * role gets chosen, keeping that decision in one place.
 */
export async function assignUserToEvent(
  eventId: string,
  _prevState: AssignUserState,
  formData: FormData,
): Promise<AssignUserState> {
  const supabase = await createClient();
  await requireRole(supabase, "admin");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "") as "customer" | "scanner";

  if (!email) return { error: "Enter an email address." };
  if (role !== "customer" && role !== "scanner") {
    return { error: "Choose a role." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!profile) {
    return {
      error: `No account exists for ${email} yet — invite them first (Users > Invite), then assign them here.`,
    };
  }

  const { error } = await supabase
    .from("event_assignments")
    .insert({ event_id: eventId, user_id: profile.id, role });

  if (error) {
    if (error.code === "23505") {
      return { error: `${email} is already assigned as ${role} on this event.` };
    }
    return { error: error.message };
  }

  revalidatePath(`/admin/events/${eventId}`);
  return {};
}

export async function removeEventAssignment(eventId: string, assignmentId: string) {
  const supabase = await createClient();
  await requireRole(supabase, "admin");

  await supabase.from("event_assignments").delete().eq("id", assignmentId);
  revalidatePath(`/admin/events/${eventId}`);
}
