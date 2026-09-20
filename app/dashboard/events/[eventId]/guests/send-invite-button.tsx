"use client";

import { useState, useTransition } from "react";

export function SendInviteButton({
  label,
  action,
}: {
  label: string;
  action: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await action();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Couldn't queue that send.");
            }
          });
        }}
        className="text-sm font-medium text-zinc-900 underline disabled:opacity-60"
      >
        {pending ? "Queuing…" : label}
      </button>
      {error && <span className="ml-2 text-xs text-red-600">{error}</span>}
    </span>
  );
}
