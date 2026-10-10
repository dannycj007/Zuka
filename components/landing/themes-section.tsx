import { Reveal } from "@/components/ui/reveal";

/**
 * Mirrors the 5 fixed themes seeded by
 * supabase/migrations/0003_public_invite_access.sql (decision 5.6: a
 * fixed catalog, no designer in v1) — same names, same colors. Kept as
 * static marketing copy rather than querying the `themes` table: the
 * public landing page is unauthenticated, and `themes_select_authenticated`
 * (0002_rls.sql) only grants SELECT to signed-in users, so a live query
 * here would need its own RLS change for what's otherwise just display
 * copy. If the real theme palette ever changes, update both places.
 *
 * Per-card pricing lives in the dedicated Pricing section (#pricing)
 * below, not repeated on these cards — see DECISIONS.md 5.13.
 */
const THEMES = [
  {
    name: "Classic",
    description: "Warm cream and gold — timeless, for any occasion.",
    background: "#FBF8F3",
    accent: "#A67C1F",
    foreground: "#2B2420",
  },
  {
    name: "Garden",
    description: "Fresh greens, built for an outdoor celebration.",
    background: "#F1F7EF",
    accent: "#3F7A4E",
    foreground: "#1F2E22",
  },
  {
    name: "Royal",
    description: "Deep navy and gold — formal and elegant.",
    background: "#0E1F3C",
    accent: "#D4AF37",
    foreground: "#F3EEDD",
  },
  {
    name: "Sunset",
    description: "Warm orange tones for a lively gathering.",
    background: "#FFF2E6",
    accent: "#E0632B",
    foreground: "#4A2412",
  },
  {
    name: "Waves",
    description: "Cool teal shades — calm and coastal.",
    background: "#E9F6F6",
    accent: "#12897F",
    foreground: "#0C3636",
  },
];

export function ThemesSection() {
  return (
    <section id="themes" className="border-y border-border bg-surface/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-orange-light">
            Themes
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            A card template for every celebration
          </h2>
          <p className="mt-3 text-base text-muted">
            Pick the one that fits your event — see pricing below.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {THEMES.map((theme, i) => (
            <Reveal key={theme.name} delay={i * 70}>
              <div className="overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-border-strong">
                <div
                  className="flex h-28 items-center justify-center"
                  style={{ background: theme.background }}
                >
                  <span
                    className="font-display text-sm font-semibold"
                    style={{ color: theme.accent }}
                  >
                    {theme.name}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-display text-sm font-semibold text-foreground">
                    {theme.name}
                  </h3>
                  <p className="mt-1.5 text-xs text-muted">{theme.description}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
