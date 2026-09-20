"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeTanzanianPhone } from "@/lib/phone";
import { generateInviteToken } from "@/lib/invite-token";
import type { ImportedGuest } from "@/lib/csv-import";

export type GuestFormState = {
  error?: string;
};

function readGuestFields(formData: FormData) {
  const seatsRaw = String(formData.get("seats_allotted") ?? "").trim();
  const seats = seatsRaw ? Number.parseInt(seatsRaw, 10) : 1;

  return {
    fullName: String(formData.get("full_name") ?? "").trim(),
    salutation: String(formData.get("salutation") ?? "").trim() || null,
    phoneRaw: String(formData.get("phone_e164") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim() || null,
    category: String(formData.get("category") ?? "").trim() || null,
    tableLabel: String(formData.get("table_label") ?? "").trim() || null,
    seats: Number.isInteger(seats) && seats > 0 ? seats : 1,
    notes: String(formData.get("notes") ?? "").trim() || null,
    dietary: String(formData.get("dietary") ?? "").trim() || null,
  };
}

export async function createGuest(
  eventId: string,
  _prevState: GuestFormState,
  formData: FormData,
): Promise<GuestFormState> {
  const fields = readGuestFields(formData);
  if (!fields.fullName) return { error: "Enter the guest's name." };
  if (!fields.phoneRaw) return { error: "Enter a phone number." };

  const phone = normalizeTanzanianPhone(fields.phoneRaw);
  if (!phone.ok) return { error: phone.error };

  const supabase = await createClient();

  const { data: duplicate } = await supabase
    .from("guests")
    .select("id")
    .eq("event_id", eventId)
    .eq("phone_e164", phone.value)
    .maybeSingle();

  if (duplicate) {
    return { error: `A guest with ${phone.value} is already on this event's list.` };
  }

  const { error } = await supabase.from("guests").insert({
    event_id: eventId,
    full_name: fields.fullName,
    salutation: fields.salutation,
    phone_e164: phone.value,
    email: fields.email,
    category: fields.category,
    table_label: fields.tableLabel,
    seats_allotted: fields.seats,
    notes: fields.notes,
    dietary: fields.dietary,
    invite_token: generateInviteToken(),
  });

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/events/${eventId}/guests`);
  redirect(`/dashboard/events/${eventId}/guests`);
}

export async function updateGuest(
  eventId: string,
  guestId: string,
  _prevState: GuestFormState,
  formData: FormData,
): Promise<GuestFormState> {
  const fields = readGuestFields(formData);
  if (!fields.fullName) return { error: "Enter the guest's name." };
  if (!fields.phoneRaw) return { error: "Enter a phone number." };

  const phone = normalizeTanzanianPhone(fields.phoneRaw);
  if (!phone.ok) return { error: phone.error };

  const supabase = await createClient();

  const { data: duplicate } = await supabase
    .from("guests")
    .select("id")
    .eq("event_id", eventId)
    .eq("phone_e164", phone.value)
    .neq("id", guestId)
    .maybeSingle();

  if (duplicate) {
    return { error: `A guest with ${phone.value} is already on this event's list.` };
  }

  const { error } = await supabase
    .from("guests")
    .update({
      full_name: fields.fullName,
      salutation: fields.salutation,
      phone_e164: phone.value,
      email: fields.email,
      category: fields.category,
      table_label: fields.tableLabel,
      seats_allotted: fields.seats,
      notes: fields.notes,
      dietary: fields.dietary,
    })
    .eq("id", guestId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/events/${eventId}/guests`);
  redirect(`/dashboard/events/${eventId}/guests`);
}

export async function deleteGuest(eventId: string, guestId: string) {
  const supabase = await createClient();
  await supabase.from("guests").delete().eq("id", guestId);
  revalidatePath(`/dashboard/events/${eventId}/guests`);
}

/**
 * Commits only the rows the CSV import preview marked accepted/fixed.
 * Re-validates against the current guest list server-side (RLS-scoped to
 * the caller's own org) rather than trusting whatever the client computed
 * during preview, in case the list changed between preview and commit.
 */
export async function importGuests(eventId: string, guests: ImportedGuest[]) {
  if (guests.length === 0) {
    return { imported: 0, skipped: 0 };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("guests")
    .select("phone_e164")
    .eq("event_id", eventId);

  const existingPhones = new Set((existing ?? []).map((g) => g.phone_e164));

  const rows = guests
    .filter((guest) => !existingPhones.has(guest.phone_e164))
    .map((guest) => ({
      event_id: eventId,
      full_name: guest.full_name,
      phone_e164: guest.phone_e164,
      salutation: guest.salutation ?? null,
      email: guest.email ?? null,
      category: guest.category ?? null,
      table_label: guest.table_label ?? null,
      seats_allotted: guest.seats_allotted ?? 1,
      notes: guest.notes ?? null,
      dietary: guest.dietary ?? null,
      invite_token: generateInviteToken(),
    }));

  const skipped = guests.length - rows.length;
  if (rows.length === 0) {
    return { imported: 0, skipped };
  }

  const { error } = await supabase.from("guests").insert(rows);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/events/${eventId}/guests`);
  return { imported: rows.length, skipped };
}
