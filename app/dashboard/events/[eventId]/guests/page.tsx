import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireEvent } from "@/lib/require-event";
import { deleteGuest } from "./actions";
import { sendInvite, sendAllPending } from "./delivery-actions";
import { DeleteGuestButton } from "./delete-guest-button";
import { SendInviteButton } from "./send-invite-button";
import { SendAllButton } from "./send-all-button";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";

const DELIVERY_VARIANT: Record<string, BadgeVariant> = {
  queued: "warning",
  sent: "info",
  delivered: "success",
  read: "success",
  failed: "danger",
};

const RSVP_VARIANT: Record<string, BadgeVariant> = {
  pending: "default",
  yes: "success",
  no: "danger",
  maybe: "warning",
};

export default async function GuestsPage({
  params,
}: PageProps<"/dashboard/events/[eventId]/guests">) {
  const { eventId } = await params;
  const supabase = await createClient();
  const event = await requireEvent(supabase, eventId);

  const { data: guests } = await supabase
    .from("guests")
    .select(
      "id, full_name, phone_e164, category, table_label, seats_allotted, rsvp_status, invite_token, latest_delivery_status",
    )
    .eq("event_id", eventId)
    .order("full_name", { ascending: true });

  return (
    <div>
      <PageHeader
        eyebrow={event.name}
        title="Guest list"
        actions={
          <>
            <LinkButton href={`/dashboard/events/${eventId}/deliveries`} variant="secondary" size="sm">
              Delivery status
            </LinkButton>
            <LinkButton href={`/dashboard/events/${eventId}/guests/import`} variant="secondary" size="sm">
              Import CSV
            </LinkButton>
            <LinkButton href={`/dashboard/events/${eventId}/guests/new`} size="sm">
              + Add guest
            </LinkButton>
          </>
        }
      />

      {!guests || guests.length === 0 ? (
        <Card className="mt-8 flex flex-col items-center gap-2 px-6 py-16 text-center">
          <p className="font-display text-lg font-semibold">No guests yet</p>
          <p className="text-sm text-muted">Add one manually or import a CSV.</p>
        </Card>
      ) : (
        <>
          <div className="mt-4">
            <SendAllButton action={sendAllPending.bind(null, eventId)} />
          </div>

          <Card className="mt-4 overflow-x-auto p-0">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Table</th>
                  <th className="px-4 py-3 font-medium">RSVP</th>
                  <th className="px-4 py-3 font-medium">Delivery</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {guests.map((guest) => (
                  <tr key={guest.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-foreground">{guest.full_name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-strong">
                      {guest.phone_e164}
                    </td>
                    <td className="px-4 py-3 text-muted-strong">{guest.category ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-strong">{guest.table_label ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={RSVP_VARIANT[guest.rsvp_status] ?? "default"}>
                        {guest.rsvp_status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {guest.latest_delivery_status ? (
                        <Badge variant={DELIVERY_VARIANT[guest.latest_delivery_status] ?? "default"}>
                          {guest.latest_delivery_status}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted">Not sent</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <SendInviteButton
                          label={guest.latest_delivery_status ? "Resend" : "Send"}
                          action={sendInvite.bind(null, eventId, guest.id)}
                        />
                        <a
                          href={`/i/${guest.invite_token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-brand-orange-light hover:underline"
                        >
                          View
                        </a>
                        <Link
                          href={`/dashboard/events/${eventId}/guests/${guest.id}/edit`}
                          className="text-sm font-medium text-muted-strong hover:text-foreground hover:underline"
                        >
                          Edit
                        </Link>
                        <DeleteGuestButton
                          guestName={guest.full_name}
                          action={deleteGuest.bind(null, eventId, guest.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
