"use server";

import { createClient } from "@/lib/supabase/server";
import type { CheckInResult } from "@/lib/types/database";

export type ScanOutcome =
  | {
      ok: true;
      result: CheckInResult;
      guestId: string | null;
      fullName: string | null;
      salutation: string | null;
      category: string | null;
      tableLabel: string | null;
      seatsAllotted: number | null;
      checkedInAt: string | null;
    }
  | {
      ok: false;
      message: string;
    };

/**
 * Extracts an invite token from whatever the camera (or a manual paste)
 * handed it — the QR itself encodes the guest's full invite URL
 * (lib/qr.ts, app/i/[token]/page.tsx: `${siteUrl}/i/${token}`), so this
 * takes the last non-empty path segment. A bare token (no slashes, e.g.
 * someone typing it in by hand) passes through unchanged.
 */
function extractToken(raw: string): string {
  const trimmed = raw.trim();
  const segments = trimmed.split("/").filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : trimmed;
}

/**
 * Calls scan_check_in() (supabase/migrations/0008_scan_checkin.sql) —
 * the function itself re-checks authorization (admin, or a 'scanner'
 * event_assignments row on this exact event) regardless of what the
 * page-level gate already did, so there's no privileged path here that
 * trusts the client.
 */
export async function checkInGuest(
  eventId: string,
  rawToken: string,
  gateLabel: string | null,
): Promise<ScanOutcome> {
  const supabase = await createClient();
  const token = extractToken(rawToken);

  if (!token) {
    return { ok: false, message: "No code detected — try again." };
  }

  const { data, error } = await supabase.rpc("scan_check_in", {
    p_event_id: eventId,
    p_token: token,
    p_gate_label: gateLabel && gateLabel.trim() ? gateLabel.trim() : null,
  });

  if (error) {
    return { ok: false, message: error.message };
  }
  if (!data || data.length === 0) {
    return { ok: false, message: "No response from the server — try again." };
  }

  const row = data[0];
  return {
    ok: true,
    result: row.result,
    guestId: row.guest_id,
    fullName: row.full_name,
    salutation: row.salutation,
    category: row.category,
    tableLabel: row.table_label,
    seatsAllotted: row.seats_allotted,
    checkedInAt: row.checked_in_at,
  };
}
