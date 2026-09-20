import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireEvent } from "@/lib/require-event";
import { formatTanzaniaDateTime } from "@/lib/tanzania-time";

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{event.name}</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {formatTanzaniaDateTime(event.starts_at)}
            {event.venue_name ? ` · ${event.venue_name}` : ""}
          </p>
          <span className="mt-2 inline-block rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium capitalize text-zinc-700">
            {event.status}
          </span>
        </div>
        <Link
          href={`/dashboard/events/${eventId}/edit`}
          className="shrink-0 text-sm font-medium text-zinc-900 underline"
        >
          Edit
        </Link>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-zinc-500">Type</dt>
          <dd className="capitalize">{event.event_type}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Language</dt>
          <dd>{event.language === "sw" ? "Swahili" : "English"}</dd>
        </div>
        {event.venue_address && (
          <div className="col-span-2">
            <dt className="text-zinc-500">Venue address</dt>
            <dd>{event.venue_address}</dd>
          </div>
        )}
      </dl>

      <div className="mt-8">
        <Link
          href={`/dashboard/events/${eventId}/guests`}
          className="inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Guest list ({guestCount ?? 0})
        </Link>
      </div>
    </div>
  );
}
