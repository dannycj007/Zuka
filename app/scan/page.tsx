import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { formatTanzaniaDateTime } from "@/lib/tanzania-time";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default async function ScanHomePage() {
  const supabase = await createClient();
  const result = await getProfile(supabase);
  const user = result!.user;

  const { data: assignments } = await supabase
    .from("event_assignments")
    .select("event_id")
    .eq("user_id", user.id)
    .eq("role", "scanner");

  const eventIds = (assignments ?? []).map((a) => a.event_id);

  const { data: events } = eventIds.length
    ? await supabase
        .from("events")
        .select("id, name, starts_at, venue_name")
        .in("id", eventIds)
        .order("starts_at", { ascending: true })
    : { data: [] };

  return (
    <div>
      <PageHeader title="Your scan assignments" />

      {!events || events.length === 0 ? (
        <Card className="mt-8 flex flex-col items-center gap-2 px-6 py-16 text-center">
          <p className="font-display text-lg font-semibold">No events assigned yet</p>
          <p className="text-sm text-muted">
            Your admin will assign you to an event before it starts.
          </p>
        </Card>
      ) : (
        <ul className="mt-6 space-y-3">
          {events.map((event) => (
            <li key={event.id}>
              <Card className="p-4">
                <p className="font-medium text-foreground">{event.name}</p>
                <p className="mt-1 text-sm text-muted">
                  {formatTanzaniaDateTime(event.starts_at)}
                  {event.venue_name ? ` · ${event.venue_name}` : ""}
                </p>
                <p className="mt-3 text-xs text-muted">
                  Scanning isn&apos;t built yet — this is a placeholder for
                  the QR check-in camera, coming next.
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
