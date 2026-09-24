import Image from "next/image";

// Source graphic is 608x639 (a slightly-tall Z mark) — scale height to
// match so the icon isn't squashed into a square box.
const MARK_ASPECT = 639 / 608;

export function Logo({ size = 32, withWordmark = true }: { size?: number; withWordmark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Image
        src="/logo-mark.png"
        alt="ZukaEvents"
        width={size}
        height={Math.round(size * MARK_ASPECT)}
        className="rounded-md"
        priority
      />
      {withWordmark && (
        <span className="font-display text-lg font-bold tracking-tight">
          <span className="text-brand-gradient">Zuka</span>
          <span className="text-foreground">Events</span>
        </span>
      )}
    </span>
  );
}
