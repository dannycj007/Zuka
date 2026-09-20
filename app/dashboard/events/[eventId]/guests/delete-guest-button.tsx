"use client";

import { useTransition } from "react";

export function DeleteGuestButton({
  guestName,
  action,
}: {
  guestName: string;
  action: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(`Remove ${guestName} from this guest list?`)) {
          startTransition(() => {
            action();
          });
        }
      }}
      className="text-sm font-medium text-red-600 underline disabled:opacity-60"
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}
