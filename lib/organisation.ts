import { redirect } from "next/navigation";
import type { createClient } from "@/lib/supabase/server";

/**
 * Every organiser-facing page under /dashboard needs the caller's own
 * organisation. Centralized here since Phase 2 added several pages that
 * all need it (events, guests, CSV import).
 */
export async function requireOwnedOrg(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: org } = await supabase
    .from("organisations")
    .select("id, name")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (!org) {
    redirect("/dashboard");
  }

  return { user, org };
}
