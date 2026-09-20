"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOwnedOrg } from "@/lib/organisation";
import { parseTanzaniaLocalDateTime } from "@/lib/tanzania-time";
import { resolveGoogleMapsLocation } from "@/lib/google-maps-link";
import type { Database, EventLanguage, EventStatus } from "@/lib/types/database";

export type EventFormState = {
  error?: string;
};

function readEventFields(formData: FormData) {
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

type LocationResolution =
  | { provided: false }
  | { provided: true; lat: number; lng: number }
  | { provided: true; lat: null; lng: null };

/** Left blank → don't touch venue_lat/lng at all (matters on edit: an
 * organiser updating other fields shouldn't accidentally clear a
 * location someone already set). Provided but unparseable → treated as
 * a form error by the caller, not silently ignored. */
async function resolveLocationField(locationLink: string): Promise<LocationResolution> {
  if (!locationLink) return { provided: false };

  try {
    const resolved = await resolveGoogleMapsLocation(locationLink);
    if (!resolved) return { provided: true, lat: null, lng: null };
    return { provided: true, lat: resolved.lat, lng: resolved.lng };
  } catch {
    return { provided: true, lat: null, lng: null };
  }
}

function validateEventFields(fields: ReturnType<typeof readEventFields>) {
  if (!fields.name) return "Enter an event name.";
  if (!fields.eventType) return "Choose an event type.";
  if (!fields.startsAtLocal) return "Choose a date and time.";
  if (fields.language !== "en" && fields.language !== "sw") {
    return "Choose a valid language.";
  }
  return null;
}

export async function createEvent(
  _prevState: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const fields = readEventFields(formData);
  const fieldError = validateEventFields(fields);
  if (fieldError) return { error: fieldError };

  const startsAt = parseTanzaniaLocalDateTime(fields.startsAtLocal);
  if (!startsAt) return { error: "That date and time isn't valid." };

  const location = await resolveLocationField(fields.locationLink);
  if (location.provided && location.lat === null) {
    return {
      error:
        'Couldn\'t read a location from that. Paste a full Google Maps link (or just "lat,lng"), or leave it blank.',
    };
  }

  const supabase = await createClient();
  const { org } = await requireOwnedOrg(supabase);

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      org_id: org.id,
      name: fields.name,
      event_type: fields.eventType,
      starts_at: startsAt.toISOString(),
      venue_name: fields.venueName || null,
      venue_address: fields.venueAddress || null,
      venue_lat: location.provided ? location.lat : null,
      venue_lng: location.provided ? location.lng : null,
      language: fields.language,
      theme_id: fields.themeId,
    })
    .select("id")
    .single();

  if (error || !event) {
    return { error: error?.message ?? "Could not create the event." };
  }

  redirect(`/dashboard/events/${event.id}`);
}

export async function updateEvent(
  eventId: string,
  _prevState: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const fields = readEventFields(formData);
  const fieldError = validateEventFields(fields);
  if (fieldError) return { error: fieldError };

  const startsAt = parseTanzaniaLocalDateTime(fields.startsAtLocal);
  if (!startsAt) return { error: "That date and time isn't valid." };

  const status = String(formData.get("status") ?? "draft") as EventStatus;
  if (!["draft", "live", "closed"].includes(status)) {
    return { error: "Choose a valid status." };
  }

  const location = await resolveLocationField(fields.locationLink);
  if (location.provided && location.lat === null) {
    return {
      error:
        'Couldn\'t read a location from that. Paste a full Google Maps link (or just "lat,lng"), or leave it blank to keep the current one.',
    };
  }

  const supabase = await createClient();

  const updateData: Database["public"]["Tables"]["events"]["Update"] = {
    name: fields.name,
    event_type: fields.eventType,
    starts_at: startsAt.toISOString(),
    venue_name: fields.venueName || null,
    venue_address: fields.venueAddress || null,
    language: fields.language,
    theme_id: fields.themeId,
    status,
  };
  // Left blank on edit: don't touch venue_lat/lng, so saving other
  // changes never silently clears a location someone already set.
  if (location.provided) {
    updateData.venue_lat = location.lat;
    updateData.venue_lng = location.lng;
  }

  const { error } = await supabase.from("events").update(updateData).eq("id", eventId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/events/${eventId}`);
  redirect(`/dashboard/events/${eventId}`);
}
