import { Reveal } from "@/components/ui/reveal";
import { PencilIcon, SendIcon, QrIcon, UsersIcon } from "./icons";

const ITEMS = [
  {
    icon: PencilIcon,
    eyebrow: "Create",
    title: "Beautiful invitations",
    description: "Pick a theme with a taste of home and make it yours in minutes.",
  },
  {
    icon: SendIcon,
    eyebrow: "Send",
    title: "Straight to WhatsApp & SMS",
    description: "Reach every guest where they already are. No printing, no postage.",
  },
  {
    icon: QrIcon,
    eyebrow: "Scan",
    title: "Easy QR check-in",
    description: "Every guest gets a unique code at the door — no fakes, no confusion.",
  },
  {
    icon: UsersIcon,
    eyebrow: "Manage",
    title: "Guests & RSVPs",
    description: "Track who's coming, who's in, and watch arrivals in real time.",
  },
];

export function FeatureStrip() {
  return (
    <section className="border-y border-border bg-surface/40">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 sm:px-6 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map((item, i) => (
          <Reveal key={item.title} delay={i * 80}>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-gradient">
              <item.icon className="h-5 w-5 text-white" />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-brand-orange-light">
              {item.eyebrow}
            </p>
            <h3 className="mt-1 font-display text-base font-semibold text-foreground">
              {item.title}
            </h3>
            <p className="mt-1.5 text-sm text-muted">{item.description}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
