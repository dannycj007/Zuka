import { InviteForm } from "./invite-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default function AdminInviteUserPage() {
  return (
    <div className="mx-auto w-full max-w-lg">
      <PageHeader title="Invite a user" />
      <Card className="mt-6 p-6">
        <InviteForm />
      </Card>
    </div>
  );
}
