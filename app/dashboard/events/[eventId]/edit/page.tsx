import { createClient } from "@/lib/supabase/server";
import { requireEvent } from "@/lib/require-event";
import { updateEvent } from "../../actions";
import { EditEventForm } from "./edit-event-form";

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
      <h1 className="text-2xl font-semibold tracking-tight">Edit event</h1>
      <EditEventForm
        event={event}
        themes={themes ?? []}
        action={updateEvent.bind(null, eventId)}
      />
    </div>
  );
}
