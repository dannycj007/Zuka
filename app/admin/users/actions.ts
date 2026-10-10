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
};

/**
 * Creates the account AND sends the invite email in one step via
 * Supabase's admin invite API — this is the app's email-verification
 * step: accepting the invite link (app/auth/callback -> set-password)
 * proves the mailbox is real, so there's no separate verification flow
 * to build. No self-service signup exists anymore (see DECISIONS.md,
 * 2026-10-10) — every account starts here.
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

  if (!email) return { error: "Enter an email address." };
  if (!["admin", "customer", "scanner"].includes(role)) {
    return { error: "Choose a role." };
  }

  const admin = createAdminClient();
  const siteUrl = await getSiteUrl();

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/auth/callback`,
  });

  if (error) {
    return { error: error.message };
  }
  if (!data.user) {
    return { error: "Invite sent, but no user record came back — try again." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    email,
    role,
    full_name: fullName || null,
  });

  if (profileError) {
    return { error: `Invited, but couldn't save their role: ${profileError.message}` };
  }

  revalidatePath("/admin/users");
  return { invited: email };
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
