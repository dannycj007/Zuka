"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { nextAttemptNumber, recordDeliveryEvent, loadGuestForSend } from "@/lib/delivery/delivery-log";
import { NextSmsProvider } from "@/lib/delivery/nextsms";
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
 * Builds the invite message and sends it via NextSMS directly and
 * synchronously (see DECISIONS.md, "5.1 revised again" — no queue, no
 * pg_cron). Every attempt (success or failure) is logged as a
 * delivery_events row, which is the source of truth the status page
 * reads. A failed send is left as-is for the organiser to retry
 * manually — no automatic retry.
 */
async function sendNow(guestId: string, eventId: string): Promise<void> {
  const context = await loadGuestForSend(guestId);
  if (!context) {
    throw new Error("Guest not found.");
  }

  const siteUrl = await getSiteUrl();
  const inviteUrl = `${siteUrl}/i/${context.inviteToken}`;
  const text = getInviteSmsText(context.language, context.fullName, context.eventName, inviteUrl);

  const attemptNumber = await nextAttemptNumber(guestId);
  const result = await new NextSmsProvider().send({ to: context.phoneE164, text });

  await recordDeliveryEvent({
    guestId,
    eventId,
    channel: "sms",
    provider: "nextsms",
    status: result.ok ? "sent" : "failed",
    attemptNumber,
    providerMessageId: result.ok ? result.providerMessageId : null,
    errorCode: result.ok ? null : result.errorCode,
    errorMessage: result.ok ? null : result.errorMessage,
  });
}

export async function sendInvite(eventId: string, guestId: string): Promise<void> {
  const owned = await verifyGuestOwnership(eventId, guestId);
  if (!owned) {
    throw new Error("Guest not found.");
  }

  await sendNow(guestId, eventId);

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
    await sendNow(guest.id, eventId);
  }

  revalidatePath(`/dashboard/events/${eventId}/guests`);
  revalidatePath(`/dashboard/events/${eventId}/deliveries`);
  return { count: pending.length };
}
