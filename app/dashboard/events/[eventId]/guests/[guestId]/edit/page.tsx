import { createClient } from "@/lib/supabase/server";
import { requireEvent } from "@/lib/require-event";
import { requireGuest } from "@/lib/require-guest";
import { updateGuest } from "../../actions";
import { GuestForm } from "../../guest-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default async function EditGuestPage({
  params,
}: PageProps<"/dashboard/events/[eventId]/guests/[guestId]/edit">) {
  const { eventId, guestId } = await params;
  const supabase = await createClient();
  await requireEvent(supabase, eventId);
  const guest = await requireGuest(supabase, eventId, guestId);

  return (
    <div className="mx-auto w-full max-w-lg">
      <PageHeader title="Edit guest" description={guest.full_name} />
      <Card className="mt-6 p-6">
        <GuestForm guest={guest} action={updateGuest.bind(null, eventId, guestId)} />
      </Card>
    </div>
  );
}
