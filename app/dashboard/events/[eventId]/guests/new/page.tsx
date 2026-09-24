import { createClient } from "@/lib/supabase/server";
import { requireEvent } from "@/lib/require-event";
import { createGuest } from "../actions";
import { GuestForm } from "../guest-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default async function NewGuestPage({
  params,
}: PageProps<"/dashboard/events/[eventId]/guests/new">) {
  const { eventId } = await params;
  const supabase = await createClient();
  await requireEvent(supabase, eventId);

  return (
    <div className="mx-auto w-full max-w-lg">
      <PageHeader title="Add guest" />
      <Card className="mt-6 p-6">
        <GuestForm action={createGuest.bind(null, eventId)} />
      </Card>
    </div>
  );
}
