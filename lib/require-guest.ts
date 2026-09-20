import { notFound } from "next/navigation";
import type { createClient } from "@/lib/supabase/server";

/** Same posture as requireEvent: RLS scopes the row to the caller's own
 * org, and a guest that doesn't belong to the given event is treated the
 * same as one that doesn't exist at all. */
export async function requireGuest(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  guestId: string,
) {
  const { data: guest } = await supabase
    .from("guests")
    .select("*")
    .eq("id", guestId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (!guest) {
    notFound();
  }

  return guest;
}
