import { createClient } from "@/lib/supabase/server";
import { NewEventForm } from "./new-event-form";

export default async function NewEventPage() {
  const supabase = await createClient();
  const { data: themes } = await supabase
    .from("themes")
    .select("id, name")
    .order("name", { ascending: true });

  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight">New event</h1>
      <NewEventForm themes={themes ?? []} />
    </div>
  );
}
