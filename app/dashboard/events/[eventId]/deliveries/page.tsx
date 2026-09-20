import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireEvent } from "@/lib/require-event";
import { sendInvite } from "../guests/delivery-actions";
import { SendInviteButton } from "../guests/send-invite-button";

const STATUSES = ["queued", "sent", "delivered", "read", "failed"] as const;

export default async function DeliveriesPage({
  params,
}: PageProps<"/dashboard/events/[eventId]/deliveries">) {
  const { eventId } = await params;
  const supabase = await createClient();
  const event = await requireEvent(supabase, eventId);

  const { data: guests } = await supabase
    .from("guests")
    .select("id, full_name, phone_e164, latest_delivery_status")
    .eq("event_id", eventId);

  const allGuests = guests ?? [];

  const counts: Record<string, number> = { not_sent: 0 };
  for (const status of STATUSES) counts[status] = 0;
  for (const guest of allGuests) {
    if (!guest.latest_delivery_status) {
      counts.not_sent += 1;
    } else {
      counts[guest.latest_delivery_status] = (counts[guest.latest_delivery_status] ?? 0) + 1;
    }
  }

  const failedGuests = allGuests.filter((g) => g.latest_delivery_status === "failed");

  let failedEvents: { guest_id: string; error_code: string | null; error_message: string | null }[] = [];
  if (failedGuests.length > 0) {
    const { data } = await supabase
      .from("delivery_events")
      .select("guest_id, error_code, error_message, created_at")
      .eq("event_id", eventId)
      .eq("status", "failed")
      .order("created_at", { ascending: false });
    failedEvents = data ?? [];
  }

  // Most recent failure per guest — first occurrence wins since the
  // query above is already ordered newest-first.
  const latestErrorByGuest = new Map<string, { error_code: string | null; error_message: string | null }>();
  for (const row of failedEvents) {
    if (!latestErrorByGuest.has(row.guest_id)) {
      latestErrorByGuest.set(row.guest_id, { error_code: row.error_code, error_message: row.error_message });
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Delivery status</h1>
          <p className="mt-1 text-sm text-zinc-600">{event.name}</p>
        </div>
        <Link
          href={`/dashboard/events/${eventId}/guests`}
          className="shrink-0 text-sm font-medium text-zinc-900 underline"
        >
          Back to guest list
        </Link>
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
        <StatCard label="Not sent" value={counts.not_sent} />
        <StatCard label="Queued" value={counts.queued} />
        <StatCard label="Sent" value={counts.sent} />
        <StatCard label="Delivered" value={counts.delivered} />
        <StatCard label="Read" value={counts.read} />
        <StatCard label="Failed" value={counts.failed} highlight={counts.failed > 0} />
      </dl>

      <h2 className="mt-10 text-lg font-medium">Failures</h2>
      {failedGuests.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-600">No failed deliveries.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Phone</th>
                <th className="py-2 pr-4 font-medium">Reason</th>
                <th className="py-2 pr-4 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {failedGuests.map((guest) => {
                const detail = latestErrorByGuest.get(guest.id);
                return (
                  <tr key={guest.id}>
                    <td className="py-2 pr-4">{guest.full_name}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{guest.phone_e164}</td>
                    <td className="py-2 pr-4 text-zinc-600">
                      {detail?.error_message ?? "Unknown error"}
                      {detail?.error_code ? ` (${detail.error_code})` : ""}
                    </td>
                    <td className="py-2 pr-4">
                      <SendInviteButton label="Retry" action={sendInvite.bind(null, eventId, guest.id)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 text-center ${
        highlight ? "border-red-300 bg-red-50" : "border-zinc-200"
      }`}
    >
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-1 text-xl font-semibold">{value}</dd>
    </div>
  );
}
