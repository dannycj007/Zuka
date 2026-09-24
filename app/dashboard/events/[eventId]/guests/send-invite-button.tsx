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
              setError(err instanceof Error ? err.message : "Couldn't send that invite.");
            }
          });
        }}
        className="text-sm font-medium text-brand-orange-light hover:underline disabled:opacity-60"
      >
        {pending ? "Sending…" : label}
      </button>
      {error && <span className="ml-2 text-xs text-danger">{error}</span>}
    </span>
  );
}
