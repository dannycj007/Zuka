"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { nextAttemptNumber, recordDeliveryEvent, loadGuestForSend } from "@/lib/delivery/delivery-log";
import { getInviteSmsText } from "@/lib/i18n";
import { getSiteUrl } from "@/lib/site-url";

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

/**
 * Builds the invite message and queues a send_jobs row for it — the
 * pg_cron-scheduled dispatch_send_jobs() picks it up within a minute
 * (see supabase/migrations/0004_send_jobs_pg_cron.sql). Also writes a
 * "queued" delivery_events row immediately, so the status view reflects
 * it right away rather than waiting for the next cron tick.
 */
async function queueSend(guestId: string, eventId: string): Promise<void> {
  const context = await loadGuestForSend(guestId);
  if (!context) {
    throw new Error("Guest not found.");
  }

  const siteUrl = await getSiteUrl();
  const inviteUrl = `${siteUrl}/i/${context.inviteToken}`;
  const text = getInviteSmsText(context.language, context.fullName, context.eventName, inviteUrl);

  const attemptNumber = await nextAttemptNumber(guestId);
  await recordDeliveryEvent({
    guestId,
    eventId,
    channel: "sms",
    provider: "nextsms",
    status: "queued",
    attemptNumber,
  });

  const admin = createAdminClient();
  const { error } = await admin.from("send_jobs").insert({
    guest_id: guestId,
    event_id: eventId,
    attempt_number: attemptNumber,
    to_phone: context.phoneE164,
    message_text: text,
  });

  if (error) {
    throw new Error(`Failed to queue send: ${error.message}`);
  }
}

export async function sendInvite(eventId: string, guestId: string): Promise<void> {
  const owned = await verifyGuestOwnership(eventId, guestId);
  if (!owned) {
    throw new Error("Guest not found.");
  }

  await queueSend(guestId, eventId);

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
  for (const guest of pending) {
    await queueSend(guest.id, eventId);
  }

  revalidatePath(`/dashboard/events/${eventId}/guests`);
  revalidatePath(`/dashboard/events/${eventId}/deliveries`);
  return { count: pending.length };
}
