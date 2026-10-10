import Link from "next/link";
import { Logo } from "@/components/ui/logo";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#tanzania", label: "Built for Tanzania" },
  { href: "/login", label: "Sign in" },
];

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 px-4 py-10 text-center sm:flex-row sm:px-6 sm:text-left">
        <div>
          <Logo size={24} />
          <p className="mt-2 text-sm text-muted">
            Beautiful invitations, sent on WhatsApp and SMS, with QR check-in
            at the door.
          </p>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {LINKS.map((link) =>
            link.href.startsWith("#") ? (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-muted-strong transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-strong transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>
      </div>
      <p className="border-t border-border px-4 py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} ZukaEvents. All rights reserved.
      </p>
    </footer>
  );
}
