import { redirect } from "next/navigation";
import type { createClient } from "@/lib/supabase/server";
import type { ProfileRole } from "@/lib/types/database";

export const ROLE_HOME_PATH: Record<ProfileRole, string> = {
  admin: "/admin",
  customer: "/dashboard",
  scanner: "/scan",
};

/**
 * Looks up the signed-in user's role. Every account gets a profiles row
 * at invite time (see app/admin/users/actions.ts) — there's no
 * self-service signup anymore, so a missing profile means something
 * went wrong provisioning the account, not a normal "new user" case.
 */
export async function getProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;
  return { user, profile };
}

/** Redirects to /login if not signed in, or to the role's own home area
 * if signed in but holding the wrong role for this route tree. */
export async function requireRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  role: ProfileRole,
) {
  return requireAnyRole(supabase, [role]);
}

/**
 * Same as requireRole, but accepts any role in the list. Used by
 * /dashboard: admin needs full operational access to the same guest
 * list / CSV import / delivery status pages a customer uses (so admin
 * can help set an event up), rather than a separate duplicate admin
 * copy of all of that UI. RLS still scopes what each role can actually
 * see/do within those pages — this only gates which route trees a role
 * can enter.
 */
export async function requireAnyRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  roles: ProfileRole[],
) {
  const result = await getProfile(supabase);
  if (!result) {
    redirect("/login");
  }
  if (!roles.includes(result.profile.role)) {
    redirect(ROLE_HOME_PATH[result.profile.role]);
  }
  return result;
}

/**
 * Gates /scan. A plain requireRole(supabase, "scanner") would be too
 * narrow: decision 5.8's "customer does their own door, no scanner
 * hired" case is a customer account (profile.role === "customer") that
 * holds a second, admin-granted 'scanner' row in event_assignments on
 * their own event — their account role never changes. So this also
 * admits a customer who holds at least one such row, alongside
 * dedicated 'scanner' profiles and admin (who passes every
 * scan_check_in() authorization check unconditionally and should be
 * able to reach the area to test/help out).
 */
export async function requireScanAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const result = await getProfile(supabase);
  if (!result) {
    redirect("/login");
  }
  const { user, profile } = result;

  if (profile.role === "admin" || profile.role === "scanner") {
    return result;
  }

  const { data } = await supabase
    .from("event_assignments")
    .select("id")
    .eq("user_id", user.id)
    .eq("role", "scanner")
    .limit(1);

  if (!data || data.length === 0) {
    redirect(ROLE_HOME_PATH[profile.role]);
  }

  return result;
}
