import type { InviteData } from "./get-invite";

const ICS_DEFAULT_DURATION_HOURS = 3;

/** A Google Maps search link — prefers precise lat/lng when the
 * organiser set them, falls back to the free-text address or venue name.
 * Returns null when there's nothing to link to at all. */
export function getMapsUrl(
  invite: Pick<InviteData, "venueLat" | "venueLng" | "venueAddress" | "venueName">,
): string | null {
  if (invite.venueLat != null && invite.venueLng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${invite.venueLat},${invite.venueLng}`;
  }
  const query = invite.venueAddress || invite.venueName;
  if (query) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }
  return null;
}

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]|\.\d{3}/g, "");
}

/** A "one click, no download" add-to-calendar link. The .ics download
 * (buildIcs below) covers Apple/Outlook, which don't support this URL
 * scheme. No stored event duration in the schema, so this assumes a
 * typical 3-hour event — good enough for a calendar block, not claimed
 * as the event's real end time anywhere else. */
export function getGoogleCalendarUrl(
  invite: Pick<InviteData, "eventName" | "startsAt" | "venueAddress" | "venueName">,
): string {
  const start = new Date(invite.startsAt);
  const end = new Date(start.getTime() + ICS_DEFAULT_DURATION_HOURS * 60 * 60 * 1000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: invite.eventName,
    dates: `${formatIcsDate(start)}/${formatIcsDate(end)}`,
    location: invite.venueAddress ?? invite.venueName ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function icsEscape(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** A minimal single-VEVENT .ics file for Apple/Outlook calendar import.
 * CRLF line endings are required by RFC 5545, not a stylistic choice. */
export function buildIcs(
  invite: Pick<InviteData, "eventName" | "startsAt" | "venueAddress" | "venueName">,
): string {
  const start = new Date(invite.startsAt);
  const end = new Date(start.getTime() + ICS_DEFAULT_DURATION_HOURS * 60 * 60 * 1000);
  const location = invite.venueAddress ?? invite.venueName ?? null;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ZukaEvents//Invite//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${globalThis.crypto.randomUUID()}@zukaevents`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${icsEscape(invite.eventName)}`,
    location ? `LOCATION:${icsEscape(location)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((line): line is string => line !== null);

  return lines.join("\r\n");
}
