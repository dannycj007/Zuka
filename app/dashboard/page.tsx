import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { formatTanzaniaDateTime } from "@/lib/tanzania-time";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: "default",
  live: "success",
  closed: "default",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const result = await getProfile(supabase);
  if (!result) redirect("/login");
  const { user, profile } = result;

  // Admin has no personal "my events" list — their home is /admin, which
  // sees every event. Only land here at all via requireAnyRole letting
  // them into this route tree for the guest/delivery pages.
  if (profile.role === "admin") {
    redirect("/admin");
  }

  const { data: assignments } = await supabase
    .from("event_assignments")
    .select("event_id")
    .eq("user_id", user.id)
    .eq("role", "customer");

  const eventIds = (assignments ?? []).map((a) => a.event_id);

  const { data: events } = eventIds.length
    ? await supabase
        .from("events")
        .select("id, name, starts_at, status")
        .in("id", eventIds)
        .order("starts_at", { ascending: true })
    : { data: [] };

  return (
    <div>
      <PageHeader eyebrow={profile.full_name ?? profile.email} title="Your events" />

      {!events || events.length === 0 ? (
        <Card className="mt-8 flex flex-col items-center gap-2 px-6 py-16 text-center">
          <p className="font-display text-lg font-semibold">No events yet</p>
          <p className="text-sm text-muted">
            Your ZukaEvents admin will set up your event and give you
            access — nothing to do here until then.
          </p>
        </Card>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {events.map((event) => (
            <li key={event.id}>
              <Link href={`/dashboard/events/${event.id}`}>
                <Card className="flex items-center justify-between gap-3 p-4 transition-colors hover:border-border-strong">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {event.name}
                    </p>
                    <p className="mt-1 text-sm text-muted">
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
