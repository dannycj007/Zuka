import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireScanAccess } from "@/lib/profile";
import { Logo } from "@/components/ui/logo";
import { NavArrows } from "@/components/ui/nav-arrows";
import { logout } from "@/app/dashboard/actions";

export default async function ScanLayout({ children }: LayoutProps<"/scan">) {
  const supabase = await createClient();
  await requireScanAccess(supabase);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border bg-surface/80 backdrop-blur supports-[backdrop-filter]:bg-surface/60">
        <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <NavArrows />
            <Link href="/scan">
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
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-8">
        {children}
      </main>
    </div>
  );
}
