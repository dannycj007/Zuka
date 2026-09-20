import { createClient } from "@/lib/supabase/server";
import { requireEvent } from "@/lib/require-event";
import { createGuest } from "../actions";
import { GuestForm } from "../guest-form";

export default async function NewGuestPage({
  params,
}: PageProps<"/dashboard/events/[eventId]/guests/new">) {
  const { eventId } = await params;
  const supabase = await createClient();
  await requireEvent(supabase, eventId);

  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight">Add guest</h1>
      <GuestForm action={createGuest.bind(null, eventId)} />
    </div>
  );
}
