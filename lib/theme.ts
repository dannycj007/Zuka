/**
 * Shape of `themes.config` (jsonb). Defined here as the TypeScript source
 * of truth for what a theme *means* to the app; the actual 5 fixed
 * palettes (decision 5.6: fixed themes, no designer in v1) live as seed
 * data in supabase/migrations/0003_public_invite_access.sql, matching
 * this shape.
 */
export type ThemeColors = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  accent: string;
  accentForeground: string;
  muted: string;
};

export type ThemeConfig = {
  colors: ThemeColors;
};

/** Used when an event has no theme_id, or the stored config is missing
 * fields — the invite page must never break because of a theming issue. */
export const DEFAULT_THEME: ThemeConfig = {
  colors: {
    background: "#FBF8F3",
    foreground: "#2B2420",
    card: "#FFFFFF",
    cardForeground: "#2B2420",
    accent: "#A67C1F",
    accentForeground: "#FFFFFF",
    muted: "#7A6F63",
  },
};

/** Defensively normalizes an arbitrary jsonb value into a complete
 * ThemeConfig, falling back field-by-field to DEFAULT_THEME rather than
 * failing closed on a malformed or partial config. */
export function parseThemeConfig(raw: unknown): ThemeConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_THEME;

  const colorsRaw = (raw as { colors?: unknown }).colors;
  if (!colorsRaw || typeof colorsRaw !== "object") return DEFAULT_THEME;

  const colors = colorsRaw as Partial<ThemeColors>;
  const isHex = (value: unknown): value is string =>
    typeof value === "string" && /^#[0-9a-fA-F]{3,8}$/.test(value);

  return {
    colors: {
      background: isHex(colors.background) ? colors.background : DEFAULT_THEME.colors.background,
      foreground: isHex(colors.foreground) ? colors.foreground : DEFAULT_THEME.colors.foreground,
      card: isHex(colors.card) ? colors.card : DEFAULT_THEME.colors.card,
      cardForeground: isHex(colors.cardForeground) ? colors.cardForeground : DEFAULT_THEME.colors.cardForeground,
      accent: isHex(colors.accent) ? colors.accent : DEFAULT_THEME.colors.accent,
      accentForeground: isHex(colors.accentForeground) ? colors.accentForeground : DEFAULT_THEME.colors.accentForeground,
      muted: isHex(colors.muted) ? colors.muted : DEFAULT_THEME.colors.muted,
    },
  };
}

/** CSS custom properties for the theme, spread onto a wrapper element's
 * `style` prop. The rest of the page references these via Tailwind's
 * arbitrary-value syntax (e.g. `bg-[var(--zuka-bg)]`) so the markup stays
 * identical across themes. */
export function themeCssVars(theme: ThemeConfig): React.CSSProperties {
  return {
    "--zuka-bg": theme.colors.background,
    "--zuka-fg": theme.colors.foreground,
    "--zuka-card": theme.colors.card,
    "--zuka-card-fg": theme.colors.cardForeground,
    "--zuka-accent": theme.colors.accent,
    "--zuka-accent-fg": theme.colors.accentForeground,
    "--zuka-muted": theme.colors.muted,
  } as React.CSSProperties;
}
