import Image from "next/image";

export function Logo({ size = 32, withWordmark = true }: { size?: number; withWordmark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Image
        src="/logo.webp"
        alt="ZukaEvents"
        width={size}
        height={size}
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
