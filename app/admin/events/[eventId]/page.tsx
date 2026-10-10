import { createClient } from "@/lib/supabase/server";
import { requireEvent } from "@/lib/require-event";
import { formatTanzaniaDateTime } from "@/lib/tanzania-time";
import { assignUserToEvent, removeEventAssignment } from "@/app/admin/users/actions";
import { AssignUserForm } from "./assign-user-form";
import { RemoveAssignmentButton } from "./remove-assignment-button";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: "default",
  live: "success",
  closed: "default",
};

const ROLE_VARIANT: Record<string, BadgeVariant> = {
  customer: "info",
  scanner: "warning",
};

export default async function AdminEventDetailPage({
  params,
}: PageProps<"/admin/events/[eventId]">) {
  const { eventId } = await params;
  const supabase = await createClient();
  const event = await requireEvent(supabase, eventId);

  const { data: org } = await supabase
    .from("organisations")
    .select("name")
    .eq("id", event.org_id)
    .maybeSingle();

  const { data: assignments } = await supabase
    .from("event_assignments")
    .select("id, user_id, role, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  const userIds = [...new Set((assignments ?? []).map((a) => a.user_id))];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, email, full_name").in("id", userIds)
    : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return (
    <div>
      <PageHeader
        eyebrow={org?.name ?? "—"}
        title={event.name}
        description={
          formatTanzaniaDateTime(event.starts_at) +
          (event.venue_name ? ` · ${event.venue_name}` : "")
        }
        actions={
          <>
            <Badge variant={STATUS_VARIANT[event.status] ?? "default"}>{event.status}</Badge>
            <LinkButton href={`/admin/events/${eventId}/edit`} variant="secondary" size="sm">
              Edit
            </LinkButton>
          </>
        }
      />

      <div className="mt-6 flex flex-wrap gap-3">
        <LinkButton href={`/dashboard/events/${eventId}/guests`}>Guest list</LinkButton>
        <LinkButton href={`/dashboard/events/${eventId}/deliveries`} variant="secondary">
          Delivery status
        </LinkButton>
      </div>

      <h2 className="mt-10 font-display text-lg font-semibold">People with access</h2>
      {!assignments || assignments.length === 0 ? (
        <p className="mt-2 text-sm text-muted">
          Nobody assigned yet — this event is only visible to admin.
        </p>
      ) : (
        <Card className="mt-3 overflow-x-auto p-0">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assignments.map((assignment) => {
                const profile = profileById.get(assignment.user_id);
                return (
                  <tr key={assignment.id}>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {profile?.full_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-strong">{profile?.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={ROLE_VARIANT[assignment.role] ?? "default"}>
                        {assignment.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <RemoveAssignmentButton
                        action={removeEventAssignment.bind(null, eventId, assignment.id)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <h2 className="mt-10 font-display text-lg font-semibold">Assign someone</h2>
      <p className="mt-1 text-sm text-muted">
        They need an account already (Users → Invite) before you can assign
        them. Granting a customer their own &quot;scanner&quot; role on this
        same event — for when no door staff are hired — is just assigning
        the same email twice, once as customer and once as scanner.
      </p>
      <Card className="mt-3 max-w-md p-6">
        <AssignUserForm action={assignUserToEvent.bind(null, eventId)} />
      </Card>
    </div>
  );
}
