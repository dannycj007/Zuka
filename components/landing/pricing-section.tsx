import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { MailIcon, SendIcon, ChatIcon } from "./icons";

/**
 * Real, confirmed rates (2026-10-10 — see DECISIONS.md 5.13), not
 * placeholder numbers: 50 Tsh/card flat across every theme, SMS 100
 * Tsh/message, WhatsApp 1000 Tsh/message. Pay-as-you-go, no
 * subscription — there's no billing/checkout system built, so this is
 * informational pricing copy, same as the rest of the landing page;
 * every CTA still routes to /login, not a payment flow.
 */
const CARD_PRICE_TSH = 50;
const SMS_PRICE_TSH = 100;
const WHATSAPP_PRICE_TSH = 1000;

const EXAMPLE_GUESTS = 100;

function tsh(n: number) {
  return `${n.toLocaleString("en-US")} Tsh`;
}

const RATES = [
  {
    icon: MailIcon,
    label: "Invitation cards",
    price: `${CARD_PRICE_TSH} Tsh`,
    unit: "per card",
    example: `${EXAMPLE_GUESTS} guests × ${tsh(CARD_PRICE_TSH)} = ${tsh(EXAMPLE_GUESTS * CARD_PRICE_TSH)}`,
    note: "Every template is the same price — pick whichever fits your event.",
  },
  {
    icon: SendIcon,
    label: "SMS",
    price: `${SMS_PRICE_TSH} Tsh`,
    unit: "per message",
    example: `${EXAMPLE_GUESTS} guests × ${tsh(SMS_PRICE_TSH)} = ${tsh(EXAMPLE_GUESTS * SMS_PRICE_TSH)}`,
    note: "Charged per send — invites, reminders, and thank-yous each count.",
  },
  {
    icon: ChatIcon,
    label: "WhatsApp",
    price: `${WHATSAPP_PRICE_TSH} Tsh`,
    unit: "per message",
    example: `${EXAMPLE_GUESTS} guests × ${tsh(WHATSAPP_PRICE_TSH)} = ${tsh(EXAMPLE_GUESTS * WHATSAPP_PRICE_TSH)}`,
    note: "Charged per send, same as SMS — pick whichever reaches your guests.",
  },
];

const ROUNDS = 3;
const ROUND_TOTAL = ROUNDS * EXAMPLE_GUESTS * WHATSAPP_PRICE_TSH;

export function PricingSection() {
  return (
    <section id="pricing" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-orange-light">
          Pricing
        </p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Pay only for what you send
        </h2>
        <p className="mt-3 text-base text-muted">
          No subscription. You pay per card and per message — only for the
          guests you actually invite.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {RATES.map((rate, i) => (
          <Reveal key={rate.label} delay={i * 80}>
            <Card className="h-full p-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-raised text-brand-orange-light">
                <rate.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-foreground">
                {rate.label}
              </h3>
              <p className="mt-1 font-display text-2xl font-bold text-foreground">
                {rate.price}
                <span className="ml-1 text-sm font-normal text-muted">{rate.unit}</span>
              </p>
              <p className="mt-2 text-sm text-muted">{rate.note}</p>
              <p className="mt-4 rounded-lg bg-surface-raised px-3 py-2 font-mono text-xs text-muted-strong">
                {rate.example}
              </p>
            </Card>
          </Reveal>
        ))}
      </div>

      <Reveal delay={240} className="mt-8">
        <Card className="p-6 text-center sm:p-8">
          <p className="text-sm text-muted">
            Example: an invite plus two reminders — {ROUNDS} WhatsApp sends to{" "}
            {EXAMPLE_GUESTS} guests —
          </p>
          <p className="mt-1 font-display text-lg font-semibold text-foreground">
            {ROUNDS} × {EXAMPLE_GUESTS} × {tsh(WHATSAPP_PRICE_TSH)} = {tsh(ROUND_TOTAL)} total
          </p>
        </Card>
      </Reveal>
    </section>
  );
}
