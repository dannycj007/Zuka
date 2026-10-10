"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/profile";
import { parseTanzaniaLocalDateTime } from "@/lib/tanzania-time";
import {
  readEventFields,
  validateEventFields,
  resolveLocationField,
} from "@/lib/event-form-fields";

export type CreateEventState = {
  error?: string;
};

/** Looks up an organisation (client) by exact name, creating it if this
 * is the first event for them — keeps admin event creation to one
 * screen instead of a separate "create client" step first. */
async function resolveOrgId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgName: string,
  adminUserId: string,
): Promise<{ id: string } | { error: string }> {
  const { data: existing } = await supabase
    .from("organisations")
    .select("id")
    .eq("name", orgName)
    .maybeSingle();

  if (existing) return { id: existing.id };

  const { data: created, error } = await supabase
    .from("organisations")
    .insert({ name: orgName, created_by: adminUserId })
    .select("id")
    .single();

  if (error || !created) {
    return { error: error?.message ?? "Could not create the client record." };
  }
  return { id: created.id };
}

export async function createEvent(
  _prevState: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  const supabase = await createClient();
  const { user } = await requireRole(supabase, "admin");

  const orgName = String(formData.get("org_name") ?? "").trim();
  if (!orgName) return { error: "Enter a client/organisation name." };

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

  const org = await resolveOrgId(supabase, orgName, user.id);
  if ("error" in org) return { error: org.error };

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

  redirect(`/admin/events/${event.id}`);
}
