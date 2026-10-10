import { notFound } from "next/navigation";
import type { createClient } from "@/lib/supabase/server";

/**
 * Event-level gate for /scan/[eventId], on top of requireScanAccess's
 * account-level check. An admin passes unconditionally. Anyone else
 * needs their own 'scanner' event_assignments row on THIS event
 * specifically — holding one on a different event (or a plain
 * 'customer' row with no scanner grant on this one) doesn't count, same
 * authorization scan_check_in() enforces server-side. Falls through to
 * notFound() rather than a role-home redirect, matching requireEvent's
 * "indistinguishable from a genuinely missing event" posture.
 */
export async function requireScanEventAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  isAdmin: boolean,
  eventId: string,
) {
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) {
    notFound();
  }

  if (!isAdmin) {
    const { data: assignment } = await supabase
      .from("event_assignments")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .eq("role", "scanner")
      .maybeSingle();

    if (!assignment) {
      notFound();
    }
  }

  return event;
}
