"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function SendAllButton({
  action,
}: {
  action: () => Promise<{ count: number }>;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  return (
    <span className="inline-flex items-center gap-3">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() => {
          setResult(null);
          startTransition(async () => {
            try {
              const { count } = await action();
              setResult(
                count === 0
                  ? "Everyone's already been sent an invite."
                  : `Sent ${count} invite${count === 1 ? "" : "s"}.`,
              );
            } catch (err) {
              setResult(err instanceof Error ? err.message : "Couldn't send invites.");
            }
          });
        }}
      >
        {pending ? "Sending…" : "Send to all pending"}
      </Button>
      {result && <span className="text-xs text-muted">{result}</span>}
    </span>
  );
}
