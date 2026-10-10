import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";

const ROLE_VARIANT: Record<string, BadgeVariant> = {
  admin: "danger",
  customer: "info",
  scanner: "warning",
};

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Users"
        actions={<LinkButton href="/admin/users/new">+ Invite</LinkButton>}
      />

      {!profiles || profiles.length === 0 ? (
        <Card className="mt-8 flex flex-col items-center gap-2 px-6 py-16 text-center">
          <p className="font-display text-lg font-semibold">No users yet</p>
          <p className="text-sm text-muted">
            Invite your first customer, scanner, or fellow admin.
          </p>
          <LinkButton href="/admin/users/new" className="mt-4">
            + Invite
          </LinkButton>
        </Card>
      ) : (
        <Card className="mt-6 overflow-x-auto p-0">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {profiles.map((profile) => (
                <tr key={profile.id}>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {profile.full_name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-strong">{profile.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={ROLE_VARIANT[profile.role] ?? "default"}>{profile.role}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
