import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import {
  MailIcon,
  QrIcon,
  UsersIcon,
  PulseIcon,
  SendIcon,
  SlidersIcon,
} from "./icons";

const FEATURES = [
  {
    icon: MailIcon,
    title: "Digital invitations",
    description:
      "Themed invite pages with a taste of your event. Sent via WhatsApp or SMS — no printing costs.",
  },
  {
    icon: QrIcon,
    title: "QR code for entry",
    description:
      "Each guest gets their own unique code. Scanned at the door — no fakes, no gate-crashers.",
  },
  {
    icon: UsersIcon,
    title: "Guest management",
    description:
      "Track RSVPs, categories, and table assignments. See who's checked in, anytime.",
  },
  {
    icon: PulseIcon,
    title: "Live attendance",
    description:
      "Door staff see a running count of who's arrived, pulled straight from every scan.",
  },
  {
    icon: SendIcon,
    title: "Automatic messages",
    description:
      "Invites and reminders go out on your schedule. Set it once and let the system work.",
  },
  {
    icon: SlidersIcon,
    title: "Easy to adjust",
    description:
      "Choose the look of the card from a curated set of themes. No design expertise required.",
  },
];

export function SystemFeatures() {
  return (
    <section id="features" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-orange-light">
          System features
        </p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Everything you need for the perfect event
        </h2>
        <p className="mt-3 text-base text-muted">
          From attractive cards to real-time door tracking. One system, no
          hassle.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, i) => (
          <Reveal key={feature.title} delay={i * 60}>
            <Card className="h-full p-6 transition-colors hover:border-border-strong">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-raised text-brand-orange-light">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-1.5 text-sm text-muted">{feature.description}</p>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
