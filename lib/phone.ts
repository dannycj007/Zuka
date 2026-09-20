/**
 * Normalizes a raw, possibly messy phone number into Tanzanian E.164
 * (+255 followed by 9 digits, first of those 9 being 6 or 7 — the mobile
 * network ranges SMS/WhatsApp delivery needs). Used by both the manual
 * guest form and CSV import, so "accepted as typed" vs "silently
 * reformatted" is visible to the caller via `wasChanged`.
 */
export type PhoneNormalizationResult =
  | { ok: true; value: string; wasChanged: boolean }
  | { ok: false; error: string };

export function normalizeTanzanianPhone(raw: string): PhoneNormalizationResult {
  const trimmed = raw.trim();

  if (!trimmed) {
    return { ok: false, error: "Phone number is missing" };
  }

  // Strip everything except digits and a leading +, so "+255 712 345 678",
  // "0712-345-678", "(0712) 345678" etc. all reduce to a comparable form.
  const cleaned = trimmed.replace(/[^\d+]/g, "");

  let digits: string;
  if (cleaned.startsWith("+255")) {
    digits = cleaned.slice(4);
  } else if (cleaned.startsWith("255")) {
    digits = cleaned.slice(3);
  } else if (cleaned.startsWith("0")) {
    digits = cleaned.slice(1);
  } else if (cleaned.startsWith("+")) {
    return { ok: false, error: `Not a Tanzanian number: "${trimmed}"` };
  } else {
    digits = cleaned;
  }

  // Catches a doubled-up mistake like "+2550712345678" (country code plus
  // a leading 0 that should have been dropped).
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (!/^\d{9}$/.test(digits)) {
    return {
      ok: false,
      error: `Expected 9 digits after the country code, got "${digits || "(none)"}" from "${trimmed}"`,
    };
  }

  if (!/^[67]/.test(digits)) {
    return {
      ok: false,
      error: `Not a mobile number (SMS/WhatsApp need a 6xx or 7xx number): "${trimmed}"`,
    };
  }

  const value = `+255${digits}`;
  return { ok: true, value, wasChanged: value !== trimmed };
}
