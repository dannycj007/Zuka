import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/profile";
import { Logo } from "@/components/ui/logo";
import { NavArrows } from "@/components/ui/nav-arrows";
import { logout } from "@/app/dashboard/actions";

export default async function AdminLayout({
  children,
}: LayoutProps<"/admin">) {
  const supabase = await createClient();
  await requireRole(supabase, "admin");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border bg-surface/80 backdrop-blur supports-[backdrop-filter]:bg-surface/60">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <NavArrows />
            <Link href="/admin" className="flex items-center gap-2">
              <Logo size={28} />
              <span className="rounded-full border border-brand-orange-light/40 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-brand-orange-light">
                Admin
              </span>
            </Link>
          </div>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link href="/admin" className="text-muted-strong hover:text-foreground">
              Events
            </Link>
            <Link href="/admin/users" className="text-muted-strong hover:text-foreground">
              Users
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="text-muted transition-colors hover:text-foreground"
              >
                Log out
              </button>
            </form>
          </nav>
        </div>
        <div className="h-px w-full bg-brand-gradient opacity-60" />
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8">
        {children}
      </main>
    </div>
  );
}
