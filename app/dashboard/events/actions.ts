"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOwnedOrg } from "@/lib/organisation";
import { parseTanzaniaLocalDateTime } from "@/lib/tanzania-time";
import type { EventLanguage, EventStatus } from "@/lib/types/database";

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
  };
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
      language: fields.language,
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

  const supabase = await createClient();

  const { error } = await supabase
    .from("events")
    .update({
      name: fields.name,
      event_type: fields.eventType,
      starts_at: startsAt.toISOString(),
      venue_name: fields.venueName || null,
      venue_address: fields.venueAddress || null,
      language: fields.language,
      status,
    })
    .eq("id", eventId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/events/${eventId}`);
  redirect(`/dashboard/events/${eventId}`);
}
