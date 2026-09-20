"use client";

import { useSyncExternalStore } from "react";
import type { ClientDictionary } from "@/lib/i18n";

function subscribe(callback: () => void) {
  const id = setInterval(callback, 60_000);
  return () => clearInterval(id);
}

function getClientSnapshot() {
  return Date.now();
}

// The server has no meaningful "now" for a value that must match the
// client's first paint exactly, so it renders nothing (0) until mounted —
// avoids a hydration mismatch without setState-in-effect.
function getServerSnapshot() {
  return 0;
}

export function Countdown({
  startsAt,
  dict,
}: {
  startsAt: string;
  dict: Pick<ClientDictionary, "countdownUntil" | "days" | "hours" | "minutes" | "happeningNow">;
}) {
  const now = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  if (now === 0) return null;

  const target = new Date(startsAt).getTime();
  const diff = target - now;
  if (diff <= 0) {
    return <p className="text-sm font-medium">{dict.happeningNow}</p>;
  }

  const totalMinutes = Math.floor(diff / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return (
    <div>
      <p className="text-xs uppercase tracking-wide opacity-70">{dict.countdownUntil}</p>
      <p className="mt-1 text-lg font-semibold">
        {days} {dict.days} · {hours} {dict.hours} · {minutes} {dict.minutes}
      </p>
    </div>
  );
}
