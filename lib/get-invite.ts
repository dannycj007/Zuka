import type { createClient } from "@/lib/supabase/server";
import type { EventLanguage, RsvpStatus } from "@/lib/types/database";

export type InviteData = {
  guestId: string;
  fullName: string;
  salutation: string | null;
  category: string | null;
  tableLabel: string | null;
  seatsAllotted: number;
  rsvpStatus: RsvpStatus;
  eventId: string;
  eventName: string;
  eventType: string;
  startsAt: string;
  venueName: string | null;
  venueAddress: string | null;
  venueLat: number | null;
  venueLng: number | null;
  language: EventLanguage;
  themeConfig: Record<string, unknown> | null;
};

/**
 * Looks up a guest's invite by token via the get_invite() Postgres
 * function (see supabase/migrations/0003_public_invite_access.sql),
 * never a direct `guests` select — that function returns only the
 * public-safe fields a guest's own invite page needs, nothing that would
 * leak another guest's phone number, email, or notes even in an error
 * message. Returns null for an unknown or malformed token; the caller is
 * responsible for treating that as "not found," not as a hint about
 * which part of the token was wrong.
 */
export async function getInvite(
  supabase: Awaited<ReturnType<typeof createClient>>,
  token: string,
): Promise<InviteData | null> {
  const { data, error } = await supabase.rpc("get_invite", { p_token: token });
  if (error || !data || data.length === 0) {
    return null;
  }

  const row = data[0];
  return {
    guestId: row.guest_id,
    fullName: row.full_name,
    salutation: row.salutation,
    category: row.category,
    tableLabel: row.table_label,
    seatsAllotted: row.seats_allotted,
    rsvpStatus: row.rsvp_status,
    eventId: row.event_id,
    eventName: row.event_name,
    eventType: row.event_type,
    startsAt: row.starts_at,
    venueName: row.venue_name,
    venueAddress: row.venue_address,
    venueLat: row.venue_lat,
    venueLng: row.venue_lng,
    language: row.language,
    themeConfig: row.theme_config,
  };
}
