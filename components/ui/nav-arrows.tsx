"use client";

import { useRouter } from "next/navigation";

const DEFAULT_BUTTON_CLASSES =
  "text-muted-strong hover:bg-white/5 hover:text-foreground";

export function NavArrows({ buttonClassName }: { buttonClassName?: string }) {
  const router = useRouter();
  const buttonClasses = `flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
    buttonClassName ?? DEFAULT_BUTTON_CLASSES
  }`;

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Go back"
        title="Go back"
        className={buttonClasses}
      >
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => router.forward()}
        aria-label="Go forward"
        title="Go forward"
        className={buttonClasses}
      >
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}
