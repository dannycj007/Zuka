"use client";

import { useState, useTransition } from "react";

export function SendAllButton({
  action,
}: {
  action: () => Promise<{ count: number }>;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setResult(null);
          startTransition(async () => {
            try {
              const { count } = await action();
              setResult(
                count === 0
                  ? "Everyone's already been sent an invite."
                  : `Queued ${count} invite${count === 1 ? "" : "s"}.`,
              );
            } catch (err) {
              setResult(err instanceof Error ? err.message : "Couldn't queue sends.");
            }
          });
        }}
        className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {pending ? "Queuing…" : "Send to all pending"}
      </button>
      {result && <span className="text-xs text-zinc-600">{result}</span>}
    </span>
  );
}
