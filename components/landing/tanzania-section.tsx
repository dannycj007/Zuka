import { Reveal } from "@/components/ui/reveal";
import { ChatIcon, GlobeIcon, PhoneIcon } from "./icons";

const POINTS = [
  {
    icon: ChatIcon,
    title: "WhatsApp-first",
    description:
      "Your guests live on WhatsApp — so do your invites, reminders, and RSVPs. SMS backs it up for anyone without it.",
  },
  {
    icon: GlobeIcon,
    title: "Swahili or English",
    description: "Every invite can go out in the language your guests actually read it in.",
  },
  {
    icon: PhoneIcon,
    title: "Built for Tanzanian numbers",
    description:
      "Phone numbers are validated against real Tanzanian network formats — no bounced sends from a typo.",
  },
];

export function TanzaniaSection() {
  return (
    <section id="tanzania" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <div className="aspect-[4/3] rounded-3xl bg-brand-gradient opacity-90" />
        </Reveal>

        <Reveal delay={120}>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-orange-light">
            Made for Tanzania
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Built the way your guests actually celebrate
          </h2>
          <ul className="mt-8 space-y-6">
            {POINTS.map((point) => (
              <li key={point.title} className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-brand-orange-light">
                  <point.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-foreground">
                    {point.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted">{point.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
