import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAnyRole } from "@/lib/profile";
import { Logo } from "@/components/ui/logo";
import { NavArrows } from "@/components/ui/nav-arrows";
import { logout } from "./actions";

/**
 * Customer AND admin both use this route tree — admin needs the same
 * guest list / CSV import / delivery status pages a customer uses, to
 * help set an event up, rather than a duplicate copy under /admin (see
 * lib/profile.ts's requireAnyRole doc comment). A scanner-role account
 * has no business here at all.
 */
export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const supabase = await createClient();
  await requireAnyRole(supabase, ["customer", "admin"]);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border bg-surface/80 backdrop-blur supports-[backdrop-filter]:bg-surface/60">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <NavArrows />
            <Link href="/dashboard">
              <Logo size={28} />
            </Link>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              Log out
            </button>
          </form>
        </div>
        <div className="h-px w-full bg-brand-gradient opacity-60" />
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8">
        {children}
      </main>
    </div>
  );
}
