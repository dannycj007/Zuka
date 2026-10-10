import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { LinkButton } from "@/components/ui/button";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#themes", label: "Themes" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
];

export function LandingNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/">
          <Logo size={28} />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-strong transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <LinkButton href="/login" size="sm">
          Sign in
        </LinkButton>
      </div>
    </header>
  );
}
