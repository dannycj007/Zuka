"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ClientDictionary } from "@/lib/i18n";
import type { RsvpStatus } from "@/lib/types/database";

const OPTIONS = ["yes", "maybe", "no"] as const;

export function RsvpButtons({
  token,
  initialStatus,
  dict,
}: {
  token: string;
  initialStatus: RsvpStatus;
  dict: ClientDictionary;
}) {
  const [status, setStatus] = useState<RsvpStatus>(initialStatus);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(next: (typeof OPTIONS)[number]) {
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.rpc("submit_rsvp", {
        p_token: token,
        p_status: next,
      });
      if (error) {
        setError("Something went wrong — please try again.");
        return;
      }
      setStatus(next);
    });
  }

  const optionLabel: Record<(typeof OPTIONS)[number], string> = {
    yes: dict.rsvpYes,
    no: dict.rsvpNo,
    maybe: dict.rsvpMaybe,
  };

  const confirmedMessage: Partial<Record<RsvpStatus, string>> = {
    yes: dict.rsvpRecordedYes,
    no: dict.rsvpRecordedNo,
    maybe: dict.rsvpRecordedMaybe,
  };

  return (
    <div>
      <p className="font-medium">{dict.rsvpQuestion}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        {OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            disabled={pending}
            onClick={() => submit(option)}
            className={`rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-60 ${
              status === option
                ? "border-transparent bg-[var(--zuka-accent)] text-[var(--zuka-accent-fg)]"
                : "border-[var(--zuka-muted)] bg-transparent"
            }`}
          >
            {optionLabel[option]}
          </button>
        ))}
      </div>
      {confirmedMessage[status] && (
        <p className="mt-2 text-sm" role="status">
          {confirmedMessage[status]}
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
