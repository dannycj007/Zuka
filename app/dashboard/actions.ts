"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export type CreateOrgState = {
  error?: string;
};

export async function createOrganisation(
  _prevState: CreateOrgState,
  formData: FormData,
): Promise<CreateOrgState> {
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { error: "Enter an organisation name." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("organisations")
    .insert({ name, owner_user_id: user.id });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}
