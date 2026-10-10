import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, ROLE_HOME_PATH } from "@/lib/profile";
import { Logo } from "@/components/ui/logo";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const FEATURES = [
  {
    title: "Beautiful invitations",
    description:
      "A themed invite page for every guest — countdown, venue map, QR entry pass — sent by SMS or WhatsApp.",
  },
  {
    title: "Offline-ready check-in",
    description:
      "Scan QR codes at the door with no signal required. Duplicate scans get caught and flagged automatically.",
  },
  {
    title: "Guests, organised",
    description:
      "Import a CSV, track RSVPs, and see delivery status for every invite you send, all in one place.",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const result = await getProfile(supabase);

  if (result) {
    redirect(ROLE_HOME_PATH[result.profile.role]);
  }

  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-6">
        <Logo size={28} />
        <LinkButton href="/login" variant="secondary" size="sm">
          Sign in
        </LinkButton>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-4 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-orange-light">
          Invite · Connect · Celebrate
        </p>
        <h1 className="mt-3 max-w-2xl font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Digital invitations and guest check-in, built for Tanzania
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted">
          Every event. Seamlessly invited. ZukaEvents handles invitations,
          RSVPs, and door-side check-in — even when the venue&apos;s signal
          doesn&apos;t.
        </p>
        <div className="mt-8">
          <LinkButton href="/login">Sign in to your account</LinkButton>
        </div>
        <p className="mt-4 text-sm text-muted">
          New to ZukaEvents? Accounts are set up by your event admin.
        </p>

        <div className="mt-20 grid w-full gap-4 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="p-6 text-left">
              <h2 className="font-display text-base font-semibold text-foreground">
                {feature.title}
              </h2>
              <p className="mt-2 text-sm text-muted">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>

      <footer className="mx-auto w-full max-w-5xl px-4 py-8 text-center text-xs text-muted">
        <Link href="/login" className="hover:text-foreground hover:underline">
          Sign in
        </Link>
      </footer>
    </main>
  );
}
