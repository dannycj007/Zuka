"use client";

import { useMemo, useState } from "react";
import { formatTanzaniaDateTime } from "@/lib/tanzania-time";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";

type GuestRow = {
  guest_id: string;
  full_name: string;
  salutation: string | null;
  category: string | null;
  table_label: string | null;
  seats_allotted: number;
  rsvp_status: string;
  checked_in_at: string | null;
  checked_in_gate: string | null;
};

const RSVP_VARIANT: Record<string, BadgeVariant> = {
  pending: "default",
  yes: "success",
  no: "danger",
  maybe: "warning",
};

export function GuestListFilter({ guests }: { guests: GuestRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter((g) =>
      [g.full_name, g.category, g.table_label].some((field) =>
        field?.toLowerCase().includes(q),
      ),
    );
  }, [guests, query]);

  const checkedInCount = guests.filter((g) => g.checked_in_at).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, category, or table…"
          className="field-input flex-1"
        />
        <p className="shrink-0 text-sm text-muted">
          {checkedInCount} / {guests.length} checked in
        </p>
      </div>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-16 text-center">
          <p className="font-display text-lg font-semibold">No guests found</p>
          <p className="text-sm text-muted">Try a different search.</p>
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Table</th>
                <th className="px-4 py-3 font-medium">RSVP</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((guest) => (
                <tr key={guest.guest_id}>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {guest.salutation ? `${guest.salutation} ` : ""}
                    {guest.full_name}
                  </td>
                  <td className="px-4 py-3 text-muted-strong">{guest.category ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-strong">{guest.table_label ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={RSVP_VARIANT[guest.rsvp_status] ?? "default"}>
                      {guest.rsvp_status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {guest.checked_in_at ? (
                      <div>
                        <Badge variant="success">Checked in</Badge>
                        <p className="mt-1 text-xs text-muted">
                          {formatTanzaniaDateTime(guest.checked_in_at)}
                          {guest.checked_in_gate ? ` · ${guest.checked_in_gate}` : ""}
                        </p>
                      </div>
                    ) : (
                      <Badge variant="default">Not yet</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
