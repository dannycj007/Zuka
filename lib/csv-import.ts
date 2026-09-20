import { normalizeTanzanianPhone } from "./phone.ts";

/**
 * Pure row-processing logic for CSV guest import. Kept separate from any
 * UI or Supabase code so it can run identically in the column-mapper
 * preview (client) and be unit tested without a browser or database.
 */

export type GuestField =
  | "full_name"
  | "phone_e164"
  | "salutation"
  | "email"
  | "category"
  | "table_label"
  | "seats_allotted"
  | "notes"
  | "dietary";

export const GUEST_FIELDS: GuestField[] = [
  "full_name",
  "phone_e164",
  "salutation",
  "email",
  "category",
  "table_label",
  "seats_allotted",
  "notes",
  "dietary",
];

export const REQUIRED_GUEST_FIELDS: GuestField[] = ["full_name", "phone_e164"];

export const GUEST_FIELD_LABELS: Record<GuestField, string> = {
  full_name: "Full name",
  phone_e164: "Phone number",
  salutation: "Salutation",
  email: "Email",
  category: "Category",
  table_label: "Table",
  seats_allotted: "Seats",
  notes: "Notes",
  dietary: "Dietary",
};

// Best-effort guesses for auto-mapping common column header spellings, so
// the mapper UI starts pre-filled instead of every field blank.
const HEADER_GUESSES: Record<GuestField, RegExp> = {
  full_name: /^(full[ _-]?name|guest[ _-]?name|name)$/i,
  phone_e164: /^(phone|phone[ _-]?number|mobile|mobile[ _-]?number|tel|telephone|contact)$/i,
  salutation: /^(salutation|title)$/i,
  email: /^(e-?mail|email[ _-]?address)$/i,
  category: /^(category|guest[ _-]?type|type)$/i,
  table_label: /^(table|table[ _-]?number|table[ _-]?label)$/i,
  seats_allotted: /^(seats|seats[ _-]?allotted|number[ _-]?of[ _-]?seats|party[ _-]?size|guests)$/i,
  notes: /^(notes|note|comments)$/i,
  dietary: /^(dietary|diet|dietary[ _-]?restrictions|allergies)$/i,
};

export type ColumnMapping = Partial<Record<GuestField, string>>;

export function guessColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const field of GUEST_FIELDS) {
    const pattern = HEADER_GUESSES[field];
    const match = headers.find((header) => pattern.test(header.trim()));
    if (match) {
      mapping[field] = match;
    }
  }
  return mapping;
}

export type ImportRowStatus = "accepted" | "fixed" | "rejected" | "duplicate";

export type ImportedGuest = {
  full_name: string;
  phone_e164: string;
  salutation?: string;
  email?: string;
  category?: string;
  table_label?: string;
  seats_allotted?: number;
  notes?: string;
  dietary?: string;
};

export type ProcessedGuestRow = {
  rowNumber: number;
  status: ImportRowStatus;
  reasons: string[];
  raw: Record<string, string>;
  guest?: ImportedGuest;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates, normalizes, and deduplicates mapped CSV rows into a per-row
 * verdict. Never throws and never drops a row silently — every row ends
 * up accepted, fixed (accepted with a note on what changed), rejected
 * (with a reason), or duplicate (with a reason), so the caller can render
 * a full preview before anything is committed.
 */
export function processImportRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  existingPhones: ReadonlySet<string>,
): ProcessedGuestRow[] {
  const seenInFile = new Set<string>();
  const results: ProcessedGuestRow[] = [];

  const getField = (raw: Record<string, string>, field: GuestField): string => {
    const header = mapping[field];
    if (!header) return "";
    return (raw[header] ?? "").trim();
  };

  rows.forEach((raw, index) => {
    const rowNumber = index + 1;
    const reasons: string[] = [];

    const fullName = getField(raw, "full_name");
    if (!fullName) {
      results.push({ rowNumber, status: "rejected", reasons: ["Missing full name"], raw });
      return;
    }

    const phoneRaw = getField(raw, "phone_e164");
    if (!phoneRaw) {
      results.push({ rowNumber, status: "rejected", reasons: ["Missing phone number"], raw });
      return;
    }

    const phoneResult = normalizeTanzanianPhone(phoneRaw);
    if (!phoneResult.ok) {
      results.push({ rowNumber, status: "rejected", reasons: [phoneResult.error], raw });
      return;
    }
    const phone = phoneResult.value;

    if (seenInFile.has(phone)) {
      results.push({
        rowNumber,
        status: "duplicate",
        reasons: [`Duplicate of an earlier row in this file (${phone})`],
        raw,
      });
      return;
    }
    if (existingPhones.has(phone)) {
      results.push({
        rowNumber,
        status: "duplicate",
        reasons: [`Already in this event's guest list (${phone})`],
        raw,
      });
      return;
    }
    seenInFile.add(phone);

    if (phoneResult.wasChanged) {
      reasons.push(`Phone normalized from "${phoneRaw}" to ${phone}`);
    }

    let seats: number | undefined;
    const seatsRaw = getField(raw, "seats_allotted");
    if (seatsRaw) {
      const parsed = Number.parseInt(seatsRaw, 10);
      if (Number.isInteger(parsed) && parsed > 0) {
        seats = parsed;
      } else {
        reasons.push(`Seats "${seatsRaw}" isn't a positive whole number — defaulted to 1`);
      }
    }

    let email: string | undefined = getField(raw, "email") || undefined;
    if (email && !EMAIL_PATTERN.test(email)) {
      reasons.push(`Email "${email}" doesn't look valid — dropped`);
      email = undefined;
    }

    const guest: ImportedGuest = {
      full_name: fullName,
      phone_e164: phone,
      salutation: getField(raw, "salutation") || undefined,
      email,
      category: getField(raw, "category") || undefined,
      table_label: getField(raw, "table_label") || undefined,
      seats_allotted: seats,
      notes: getField(raw, "notes") || undefined,
      dietary: getField(raw, "dietary") || undefined,
    };

    results.push({
      rowNumber,
      status: reasons.length > 0 ? "fixed" : "accepted",
      reasons,
      raw,
      guest,
    });
  });

  return results;
}
