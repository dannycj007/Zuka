import { LinkButton } from "@/components/ui/button";
import { CheckIcon, QrIcon, SendIcon } from "./icons";

const TRUST_BADGES = ["Built for Tanzania", "WhatsApp & SMS delivery", "QR check-in at the door"];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="animate-blob absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand-orange/25 blur-3xl"
      />
      <div
        aria-hidden
        className="animate-blob absolute -right-24 top-40 h-96 w-96 rounded-full bg-brand-purple/25 blur-3xl"
        style={{ animationDelay: "3s" }}
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:py-28">
        <div>
          <p className="animate-in text-xs font-semibold uppercase tracking-widest text-brand-orange-light">
            Invite · Connect · Celebrate
          </p>
          <h1
            className="animate-in mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl"
            style={{ animationDelay: "80ms" }}
          >
            Every event,
            <br />
            <span className="text-brand-gradient">seamlessly</span>
            <br />
            invited.
          </h1>
          <p
            className="animate-in mt-5 max-w-lg text-base text-muted sm:text-lg"
            style={{ animationDelay: "160ms" }}
          >
            Create beautiful digital invitations, send them straight to
            WhatsApp and SMS, and check guests in with a quick QR scan.
            ZukaEvents runs your invites, RSVPs, and the door — so you can
            enjoy the celebration.
          </p>
          <div
            className="animate-in mt-8 flex flex-wrap items-center gap-3"
            style={{ animationDelay: "240ms" }}
          >
            <LinkButton href="/login">
              Sign in to your account
            </LinkButton>
            <LinkButton href="#how-it-works" variant="secondary">
              See how it works
            </LinkButton>
          </div>
          <p
            className="animate-in mt-4 text-sm text-muted"
            style={{ animationDelay: "280ms" }}
          >
            New to ZukaEvents? Accounts are set up by your event admin.
          </p>

          <ul
            className="animate-in mt-10 flex flex-wrap gap-x-6 gap-y-2"
            style={{ animationDelay: "320ms" }}
          >
            {TRUST_BADGES.map((badge) => (
              <li key={badge} className="flex items-center gap-1.5 text-sm text-muted-strong">
                <CheckIcon className="h-4 w-4 text-success" />
                {badge}
              </li>
            ))}
          </ul>
        </div>

        <div
          className="animate-in relative mx-auto w-full max-w-sm"
          style={{ animationDelay: "200ms" }}
        >
          <div className="aspect-[4/5] rounded-3xl bg-brand-gradient p-8 shadow-2xl shadow-brand-purple/20">
            <div className="flex h-full flex-col items-center justify-center text-center text-white/90">
              <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
                Your invite preview
              </p>
              <p className="mt-2 text-sm opacity-70">
                Theme, countdown, and QR entry pass — one page per guest
              </p>
            </div>
          </div>

          <div className="animate-float-slow absolute -right-6 -top-6 flex items-center gap-2 rounded-xl border border-border-strong bg-surface/90 px-3 py-2 shadow-lg backdrop-blur">
            <SendIcon className="h-4 w-4 text-brand-orange-light" />
            <span className="text-xs font-medium text-foreground">RSVP confirmed</span>
          </div>

          <div className="animate-float-slower absolute -bottom-6 -left-6 flex items-center gap-2 rounded-xl border border-border-strong bg-surface/90 px-3 py-2 shadow-lg backdrop-blur">
            <QrIcon className="h-4 w-4 text-success" />
            <span className="text-xs font-medium text-foreground">Checked in ✓</span>
          </div>
        </div>
      </div>
    </section>
  );
}
