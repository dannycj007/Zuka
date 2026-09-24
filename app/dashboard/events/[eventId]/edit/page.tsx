import { createClient } from "@/lib/supabase/server";
import { requireEvent } from "@/lib/require-event";
import { updateEvent } from "../../actions";
import { EditEventForm } from "./edit-event-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default async function EditEventPage({
  params,
}: PageProps<"/dashboard/events/[eventId]/edit">) {
  const { eventId } = await params;
  const supabase = await createClient();
  const event = await requireEvent(supabase, eventId);
  const { data: themes } = await supabase
    .from("themes")
    .select("id, name")
    .order("name", { ascending: true });

  return (
    <div className="mx-auto w-full max-w-lg">
      <PageHeader title="Edit event" description={event.name} />
      <Card className="mt-6 p-6">
        <EditEventForm
          event={event}
          themes={themes ?? []}
          action={updateEvent.bind(null, eventId)}
        />
      </Card>
    </div>
  );
}
