import { createClient } from "@/lib/supabase/server";
import { requireEvent } from "@/lib/require-event";
import { ImportFlow } from "./import-flow";
import { PageHeader } from "@/components/ui/page-header";

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
      <PageHeader eyebrow={event.name} title="Import guests" />
      <div className="mt-6">
        <ImportFlow
          eventId={eventId}
          existingPhones={(existing ?? []).map((g) => g.phone_e164)}
        />
      </div>
    </div>
  );
}
