import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles the redirect Supabase Auth sends the user back to after they
 * click an invite email's link, exchanging the one-time code for a
 * session. There's no self-service signup anymore (see DECISIONS.md,
 * 2026-10-10), so this route is only ever reached via an admin-sent
 * invite — always send them to set a password next, never straight to
 * a role's dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/auth/set-password`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
