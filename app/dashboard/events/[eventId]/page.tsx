import { createClient } from "@/lib/supabase/server";
import { requireEvent } from "@/lib/require-event";
import { formatTanzaniaDateTime } from "@/lib/tanzania-time";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: "default",
  live: "success",
  closed: "default",
};

export default async function EventPage({
  params,
}: PageProps<"/dashboard/events/[eventId]">) {
  const { eventId } = await params;
  const supabase = await createClient();
  const event = await requireEvent(supabase, eventId);

  const { count: guestCount } = await supabase
    .from("guests")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  return (
    <div>
      <PageHeader
        eyebrow={event.event_type}
        title={event.name}
        description={
          formatTanzaniaDateTime(event.starts_at) +
          (event.venue_name ? ` · ${event.venue_name}` : "")
        }
        actions={
          <>
            <Badge variant={STATUS_VARIANT[event.status] ?? "default"}>
              {event.status}
            </Badge>
            <LinkButton href={`/dashboard/events/${eventId}/edit`} variant="secondary" size="sm">
              Edit
            </LinkButton>
          </>
        }
      />

      <Card className="mt-6 p-6">
        <dl className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <dt className="text-muted">Type</dt>
            <dd className="mt-1 capitalize text-foreground">{event.event_type}</dd>
          </div>
          <div>
            <dt className="text-muted">Language</dt>
            <dd className="mt-1 text-foreground">
              {event.language === "sw" ? "Swahili" : "English"}
            </dd>
          </div>
          {event.venue_address && (
            <div className="col-span-2">
              <dt className="text-muted">Venue address</dt>
              <dd className="mt-1 text-foreground">{event.venue_address}</dd>
            </div>
          )}
        </dl>
      </Card>

      <div className="mt-6 flex flex-wrap gap-3">
        <LinkButton href={`/dashboard/events/${eventId}/guests`}>
          Guest list ({guestCount ?? 0})
        </LinkButton>
        <LinkButton href={`/dashboard/events/${eventId}/deliveries`} variant="secondary">
          Delivery status
        </LinkButton>
      </div>
    </div>
  );
}
