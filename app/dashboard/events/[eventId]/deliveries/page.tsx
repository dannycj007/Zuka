import { createClient } from "@/lib/supabase/server";
import { requireEvent } from "@/lib/require-event";
import { sendInvite } from "../guests/delivery-actions";
import { SendInviteButton } from "../guests/send-invite-button";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";

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
      <PageHeader
        eyebrow={event.name}
        title="Delivery status"
        actions={
          <LinkButton href={`/dashboard/events/${eventId}/guests`} variant="secondary" size="sm">
            Back to guest list
          </LinkButton>
        }
      />

      <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
        <StatTile label="Not sent" value={counts.not_sent} />
        <StatTile label="Queued" value={counts.queued} tone="warning" />
        <StatTile label="Sent" value={counts.sent} tone="info" />
        <StatTile label="Delivered" value={counts.delivered} tone="success" />
        <StatTile label="Read" value={counts.read} tone="success" />
        <StatTile label="Failed" value={counts.failed} tone={counts.failed > 0 ? "danger" : "default"} />
      </div>

      <h2 className="mt-10 font-display text-lg font-semibold">Failures</h2>
      {failedGuests.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No failed deliveries.</p>
      ) : (
        <Card className="mt-3 overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {failedGuests.map((guest) => {
                const detail = latestErrorByGuest.get(guest.id);
                return (
                  <tr key={guest.id}>
                    <td className="px-4 py-3 font-medium text-foreground">{guest.full_name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-strong">
                      {guest.phone_e164}
                    </td>
                    <td className="px-4 py-3 text-danger">
                      {detail?.error_message ?? "Unknown error"}
                      {detail?.error_code ? ` (${detail.error_code})` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <SendInviteButton label="Retry" action={sendInvite.bind(null, eventId, guest.id)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
