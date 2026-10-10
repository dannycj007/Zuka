import { Reveal } from "@/components/ui/reveal";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
      <Reveal>
        <Card className="relative overflow-hidden px-6 py-16 text-center sm:px-16">
          <div
            aria-hidden
            className="animate-blob absolute -left-20 -top-20 h-64 w-64 rounded-full bg-brand-orange/20 blur-3xl"
          />
          <div
            aria-hidden
            className="animate-blob absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-brand-purple/20 blur-3xl"
            style={{ animationDelay: "4s" }}
          />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Ready for a seamless event?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-base text-muted">
              ZukaEvents handles invitations, RSVPs, and door-side check-in
              for events across Tanzania.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <LinkButton href="/login">Sign in to your account</LinkButton>
              <LinkButton href="#how-it-works" variant="secondary">
                See how it works
              </LinkButton>
            </div>
          </div>
        </Card>
      </Reveal>
    </section>
  );
}
