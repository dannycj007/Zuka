import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { requireScanEventAccess } from "@/lib/scan";
import { GuestListFilter } from "./guest-list-filter";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton } from "@/components/ui/button";

export default async function ScanGuestListPage({
  params,
}: PageProps<"/scan/[eventId]/guests">) {
  const { eventId } = await params;
  const supabase = await createClient();
  const result = await getProfile(supabase);
  const { user, profile } = result!;
  const event = await requireScanEventAccess(
    supabase,
    user.id,
    profile.role === "admin",
    eventId,
  );

  const { data: guests } = await supabase.rpc("scan_list_guests", {
    p_event_id: eventId,
  });

  return (
    <div>
      <PageHeader
        eyebrow={event.name}
        title="Guest list"
        actions={
          <LinkButton href={`/scan/${eventId}`} variant="secondary" size="sm">
            Scan
          </LinkButton>
        }
      />
      <div className="mt-6">
        <GuestListFilter guests={guests ?? []} />
      </div>
    </div>
  );
}
