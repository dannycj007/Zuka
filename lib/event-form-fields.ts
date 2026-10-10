import { resolveGoogleMapsLocation } from "@/lib/google-maps-link";
import type { EventLanguage } from "@/lib/types/database";

/** Shared by the admin "create event" and customer/admin "edit event"
 * server actions — plain helpers, not Server Actions themselves, so they
 * live outside any "use server" file (every export from one of those
 * must be an async action function). */
export function readEventFields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    eventType: String(formData.get("event_type") ?? "").trim(),
    startsAtLocal: String(formData.get("starts_at") ?? ""),
    venueName: String(formData.get("venue_name") ?? "").trim(),
    venueAddress: String(formData.get("venue_address") ?? "").trim(),
    language: String(formData.get("language") ?? "en") as EventLanguage,
    themeId: String(formData.get("theme_id") ?? "").trim() || null,
    locationLink: String(formData.get("location_link") ?? "").trim(),
  };
}

export function validateEventFields(fields: ReturnType<typeof readEventFields>) {
  if (!fields.name) return "Enter an event name.";
  if (!fields.eventType) return "Choose an event type.";
  if (!fields.startsAtLocal) return "Choose a date and time.";
  if (fields.language !== "en" && fields.language !== "sw") {
    return "Choose a valid language.";
  }
  return null;
}

export type LocationResolution =
  | { provided: false }
  | { provided: true; lat: number; lng: number }
  | { provided: true; lat: null; lng: null };

/** Left blank → don't touch venue_lat/lng at all (matters on edit: an
 * organiser updating other fields shouldn't accidentally clear a
 * location someone already set). Provided but unparseable → treated as
 * a form error by the caller, not silently ignored. */
export async function resolveLocationField(locationLink: string): Promise<LocationResolution> {
  if (!locationLink) return { provided: false };

  try {
    const resolved = await resolveGoogleMapsLocation(locationLink);
    if (!resolved) return { provided: true, lat: null, lng: null };
    return { provided: true, lat: resolved.lat, lng: resolved.lng };
  } catch {
    return { provided: true, lat: null, lng: null };
  }
}
