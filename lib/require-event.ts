import { notFound } from "next/navigation";
import type { createClient } from "@/lib/supabase/server";

/**
 * Fetches an event by id for the current organiser. Relies on RLS
 * (events_select_own_org) to make a cross-org id resolve to no rows
 * rather than someone else's data — notFound() then keeps the response
 * indistinguishable from a genuinely missing event, the same
 * no-hints-on-a-near-miss posture the invite-token route will need in
 * Phase 3.
 */
export async function requireEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
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

  return event;
}
