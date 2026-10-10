import { Reveal } from "@/components/ui/reveal";

const STEPS = [
  {
    number: "01",
    title: "Create the invite",
    description: "Your event gets set up with a theme, date, and venue.",
  },
  {
    number: "02",
    title: "Send to guests",
    description:
      "Invites go out over WhatsApp and SMS — every guest gets their own unique QR code.",
  },
  {
    number: "03",
    title: "Collect RSVPs",
    description: "Guests reply in a tap, straight from their invite page. No app required.",
  },
  {
    number: "04",
    title: "Scan at the door",
    description: "Staff scan codes to check guests in, live, right from their phone.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-border bg-surface/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-orange-light">
            How it works
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            From guest list to the front door — in four steps
          </h2>
        </Reveal>

        <div className="relative mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div
            aria-hidden
            className="absolute top-5 right-0 left-0 hidden h-px bg-border lg:block"
          />
          {STEPS.map((step, i) => (
            <Reveal key={step.number} delay={i * 100} className="relative">
              <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient font-display text-sm font-bold text-white">
                {step.number}
              </span>
              <h3 className="mt-4 font-display text-base font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-1.5 text-sm text-muted">{step.description}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
