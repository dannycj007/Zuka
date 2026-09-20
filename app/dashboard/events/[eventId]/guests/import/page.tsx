import { createClient } from "@/lib/supabase/server";
import { requireEvent } from "@/lib/require-event";
import { ImportFlow } from "./import-flow";

export default async function ImportGuestsPage({
  params,
}: PageProps<"/dashboard/events/[eventId]/guests/import">) {
  const { eventId } = await params;
  const supabase = await createClient();
  const event = await requireEvent(supabase, eventId);

  const { data: existing } = await supabase
    .from("guests")
    .select("phone_e164")
    .eq("event_id", eventId);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Import guests</h1>
      <p className="mt-1 text-sm text-zinc-600">{event.name}</p>
      <div className="mt-6">
        <ImportFlow
          eventId={eventId}
          existingPhones={(existing ?? []).map((g) => g.phone_e164)}
        />
      </div>
    </div>
  );
}
