"use client";

import { useRouter } from "next/navigation";

export function NavArrows() {
  const router = useRouter();

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Go back"
        title="Go back"
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-strong transition-colors hover:bg-white/5 hover:text-foreground"
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
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-strong transition-colors hover:bg-white/5 hover:text-foreground"
      >
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}
