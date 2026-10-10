"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseTanzaniaLocalDateTime } from "@/lib/tanzania-time";
import {
  readEventFields,
  validateEventFields,
  resolveLocationField,
} from "@/lib/event-form-fields";
import type { Database, EventStatus } from "@/lib/types/database";

export type EventFormState = {
  error?: string;
};

/**
 * Event creation is admin-only now (see app/admin/events/actions.ts and
 * DECISIONS.md's 2026-10-10 "Platform roles" entry) — events RLS blocks
 * a customer insert outright. This file keeps only updateEvent: the
 * assigned customer (or admin) can still edit an event's own details
 * after it's created, which both /dashboard and /admin's edit pages use.
 */
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
