import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { requireScanEventAccess } from "@/lib/scan";
import { ScanClient } from "./scan-client";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton } from "@/components/ui/button";

export default async function ScanEventPage({
  params,
}: PageProps<"/scan/[eventId]">) {
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

  return (
    <div>
      <PageHeader
        title={event.name}
        description={event.venue_name ?? undefined}
        actions={
          <LinkButton href={`/scan/${eventId}/guests`} variant="secondary" size="sm">
            Guest list
          </LinkButton>
        }
      />
      <div className="mt-6">
        <ScanClient eventId={eventId} />
      </div>
    </div>
  );
}
