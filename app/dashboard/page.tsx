import { createClient } from "@/lib/supabase/server";
import { CreateOrgForm } from "./create-org-form";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Layout already guarantees a session exists.
  const { data: organisation } = await supabase
    .from("organisations")
    .select("id, name")
    .eq("owner_user_id", user!.id)
    .maybeSingle();

  if (!organisation) {
    return <CreateOrgForm />;
  }

  const { data: events } = await supabase
    .from("events")
    .select("id, name, starts_at, status")
    .eq("org_id", organisation.id)
    .order("starts_at", { ascending: true });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {organisation.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">Your events</p>
        </div>
      </div>

      {!events || events.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-600">
          No events yet. (Event creation ships in Phase 2 — for now, run{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.9em]">
            npm run seed:demo
          </code>{" "}
          to populate a demo event here.)
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-zinc-200 border-y border-zinc-200">
          {events.map((event) => (
            <li key={event.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{event.name}</p>
                <p className="text-sm text-zinc-600">
                  {new Date(event.starts_at).toLocaleString()}
                </p>
              </div>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium capitalize text-zinc-700">
                {event.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
