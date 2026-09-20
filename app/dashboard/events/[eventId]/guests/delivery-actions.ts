"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import { nextAttemptNumber, recordDeliveryEvent } from "@/lib/delivery/delivery-log";

async function verifyGuestOwnership(eventId: string, guestId: string): Promise<boolean> {
  // Authenticated, RLS-scoped client — this is the ownership check, done
  // BEFORE anything touches the service-role client below.
  const supabase = await createClient();
  const { data } = await supabase
    .from("guests")
    .select("id")
    .eq("id", guestId)
    .eq("event_id", eventId)
    .maybeSingle();
  return Boolean(data);
}

/** Queues a "queued" delivery_events row immediately (so the status view
 * reflects it right away, before the background job even runs) and hands
 * the actual send off to Inngest. */
export async function sendInvite(eventId: string, guestId: string): Promise<void> {
  const owned = await verifyGuestOwnership(eventId, guestId);
  if (!owned) {
    throw new Error("Guest not found.");
  }

  const attemptNumber = await nextAttemptNumber(guestId);
  await recordDeliveryEvent({
    guestId,
    eventId,
    channel: "sms",
    provider: "nextsms",
    status: "queued",
    attemptNumber,
  });

  await inngest.send({ name: "guest/invite.send", data: { guestId, attemptNumber } });

  revalidatePath(`/dashboard/events/${eventId}/guests`);
  revalidatePath(`/dashboard/events/${eventId}/deliveries`);
}

/** Sends to every guest who hasn't had a successful send attempt yet
 * (never sent, or last attempt failed) — not a blanket resend to
 * everyone, so it's safe to click again without re-messaging guests
 * who already received their invite. */
export async function sendAllPending(eventId: string): Promise<{ count: number }> {
  const supabase = await createClient();
  const { data: guests } = await supabase
    .from("guests")
    .select("id")
    .eq("event_id", eventId)
    .or("latest_delivery_status.is.null,latest_delivery_status.eq.failed");

  const pending = guests ?? [];
  if (pending.length === 0) {
    return { count: 0 };
  }

  const events = [];
  for (const guest of pending) {
    const attemptNumber = await nextAttemptNumber(guest.id);
    await recordDeliveryEvent({
      guestId: guest.id,
      eventId,
      channel: "sms",
      provider: "nextsms",
      status: "queued",
      attemptNumber,
    });
    events.push({ name: "guest/invite.send" as const, data: { guestId: guest.id, attemptNumber } });
  }
  await inngest.send(events);

  revalidatePath(`/dashboard/events/${eventId}/guests`);
  revalidatePath(`/dashboard/events/${eventId}/deliveries`);
  return { count: pending.length };
}
