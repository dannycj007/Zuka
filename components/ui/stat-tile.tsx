export type StatTileTone = "default" | "success" | "warning" | "danger" | "info";

const tones: Record<StatTileTone, string> = {
  default: "border-border bg-surface",
  success: "border-success/30 bg-success-bg",
  warning: "border-warning/30 bg-warning-bg",
  danger: "border-danger/30 bg-danger-bg",
  info: "border-info/30 bg-info-bg",
};

const toneText: Record<StatTileTone, string> = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
};

export function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: StatTileTone;
}) {
  return (
    <div className={`rounded-xl border px-4 py-4 text-center ${tones[tone]}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${toneText[tone]}`}>{value}</p>
    </div>
  );
}
