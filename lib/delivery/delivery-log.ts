import { createAdminClient } from "@/lib/supabase/admin";
import type { DeliveryChannel, DeliveryProvider, DeliveryStatus } from "@/lib/types/database";

/**
 * delivery_events is append-only and has no client insert policy (see
 * migration 0002) — every write here goes through the service role,
 * whether from the triggering server action (organiser-authenticated,
 * but the insert itself still needs service role) or from the pg_cron
 * job that finalizes each send (see migration 0004).
 */

export type GuestSendContext = {
  guestId: string;
  eventId: string;
  fullName: string;
  phoneE164: string;
  eventName: string;
  language: string;
  inviteToken: string;
};

export async function loadGuestForSend(guestId: string): Promise<GuestSendContext | null> {
  const admin = createAdminClient();

  // Two plain queries rather than an embedded/joined select: the
  // hand-written Database type (lib/types/database.ts) declares empty
  // Relationships for every table, so a joined `events(...)` select
  // wouldn't type-check safely against it.
  const { data: guest } = await admin
    .from("guests")
    .select("id, event_id, full_name, phone_e164, invite_token")
    .eq("id", guestId)
    .maybeSingle();
  if (!guest) return null;

  const { data: event } = await admin
    .from("events")
    .select("name, language")
    .eq("id", guest.event_id)
    .maybeSingle();
  if (!event) return null;

  return {
    guestId: guest.id,
    eventId: guest.event_id,
    fullName: guest.full_name,
    phoneE164: guest.phone_e164,
    eventName: event.name,
    language: event.language,
    inviteToken: guest.invite_token,
  };
}

export async function nextAttemptNumber(guestId: string): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("delivery_events")
    .select("attempt_number")
    .eq("guest_id", guestId)
    .order("attempt_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.attempt_number ?? 0) + 1;
}

export async function recordDeliveryEvent(input: {
  guestId: string;
  eventId: string;
  channel: DeliveryChannel;
  provider: DeliveryProvider;
  status: DeliveryStatus;
  attemptNumber: number;
  providerMessageId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("delivery_events").insert({
    guest_id: input.guestId,
    event_id: input.eventId,
    channel: input.channel,
    provider: input.provider,
    status: input.status,
    attempt_number: input.attemptNumber,
    provider_message_id: input.providerMessageId ?? null,
    error_code: input.errorCode ?? null,
    error_message: input.errorMessage ?? null,
  });

  if (error) {
    throw new Error(`Failed to record delivery event: ${error.message}`);
  }
}
