import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/profile";
import { SetPasswordForm } from "./set-password-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default async function AdminSetUserPasswordPage({
  params,
}: PageProps<"/admin/users/[id]/password">) {
  const { id } = await params;
  const supabase = await createClient();
  await requireRole(supabase, "admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .eq("id", id)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <PageHeader title="Set password" description={profile.full_name ?? profile.email} />
      <Card className="mt-6 p-6">
        <SetPasswordForm userId={profile.id} />
      </Card>
    </div>
  );
}
