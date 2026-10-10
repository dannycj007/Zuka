import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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

export default async function AdminEventsPage() {
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("events")
    .select("id, name, starts_at, status, org_id")
    .order("starts_at", { ascending: true });

  const orgIds = [...new Set((events ?? []).map((e) => e.org_id))];
  const { data: orgs } = orgIds.length
    ? await supabase.from("organisations").select("id, name").in("id", orgIds)
    : { data: [] };
  const orgNameById = new Map((orgs ?? []).map((o) => [o.id, o.name]));

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="All events"
        actions={<LinkButton href="/admin/events/new">+ New event</LinkButton>}
      />

      {!events || events.length === 0 ? (
        <Card className="mt-8 flex flex-col items-center gap-2 px-6 py-16 text-center">
          <p className="font-display text-lg font-semibold">No events yet</p>
          <p className="text-sm text-muted">Create the first one to get started.</p>
          <LinkButton href="/admin/events/new" className="mt-4">
            + New event
          </LinkButton>
        </Card>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {events.map((event) => (
            <li key={event.id}>
              <Link href={`/admin/events/${event.id}`}>
                <Card className="flex items-center justify-between gap-3 p-4 transition-colors hover:border-border-strong">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{event.name}</p>
                    <p className="mt-1 text-sm text-muted">
                      {orgNameById.get(event.org_id) ?? "—"} ·{" "}
                      {formatTanzaniaDateTime(event.starts_at)}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[event.status] ?? "default"}>
                    {event.status}
                  </Badge>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
