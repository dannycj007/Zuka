import { createClient } from "@/lib/supabase/server";
import { NewEventForm } from "./new-event-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default async function NewEventPage() {
  const supabase = await createClient();
  const { data: themes } = await supabase
    .from("themes")
    .select("id, name")
    .order("name", { ascending: true });

  return (
    <div className="mx-auto w-full max-w-lg">
      <PageHeader title="New event" />
      <Card className="mt-6 p-6">
        <NewEventForm themes={themes ?? []} />
      </Card>
    </div>
  );
}
