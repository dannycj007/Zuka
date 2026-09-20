import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireEvent } from "@/lib/require-event";
import { deleteGuest } from "./actions";
import { DeleteGuestButton } from "./delete-guest-button";

export default async function GuestsPage({
  params,
}: PageProps<"/dashboard/events/[eventId]/guests">) {
  const { eventId } = await params;
  const supabase = await createClient();
  const event = await requireEvent(supabase, eventId);

  const { data: guests } = await supabase
    .from("guests")
    .select(
      "id, full_name, phone_e164, category, table_label, seats_allotted, rsvp_status, invite_token",
    )
    .eq("event_id", eventId)
    .order("full_name", { ascending: true });

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Guest list</h1>
          <p className="mt-1 text-sm text-zinc-600">{event.name}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/dashboard/events/${eventId}/guests/import`}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium"
          >
            Import CSV
          </Link>
          <Link
            href={`/dashboard/events/${eventId}/guests/new`}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            Add guest
          </Link>
        </div>
      </div>

      {!guests || guests.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-600">
          No guests yet. Add one manually or import a CSV.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Phone</th>
                <th className="py-2 pr-4 font-medium">Category</th>
                <th className="py-2 pr-4 font-medium">Table</th>
                <th className="py-2 pr-4 font-medium">Seats</th>
                <th className="py-2 pr-4 font-medium">RSVP</th>
                <th className="py-2 pr-4 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {guests.map((guest) => (
                <tr key={guest.id}>
                  <td className="py-2 pr-4">{guest.full_name}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{guest.phone_e164}</td>
                  <td className="py-2 pr-4">{guest.category ?? "—"}</td>
                  <td className="py-2 pr-4">{guest.table_label ?? "—"}</td>
                  <td className="py-2 pr-4">{guest.seats_allotted}</td>
                  <td className="py-2 pr-4 capitalize">{guest.rsvp_status}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <a
                      href={`/i/${guest.invite_token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-zinc-900 underline"
                    >
                      View invite
                    </a>
                    <span className="mx-2 text-zinc-300">·</span>
                    <Link
                      href={`/dashboard/events/${eventId}/guests/${guest.id}/edit`}
                      className="text-sm font-medium text-zinc-900 underline"
                    >
                      Edit
                    </Link>
                    <span className="mx-2 text-zinc-300">·</span>
                    <DeleteGuestButton
                      guestName={guest.full_name}
                      action={deleteGuest.bind(null, eventId, guest.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
