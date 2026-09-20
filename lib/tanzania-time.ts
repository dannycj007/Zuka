/**
 * Every event in this product is in Africa/Dar_es_Salaam, a fixed UTC+3
 * offset with no daylight saving — so converting between a wall-clock
 * value and a stored UTC instant is just a constant offset, no timezone
 * database lookups needed.
 *
 * Without this, `new Date(datetimeLocalValue)` on a
 * <input type="datetime-local"> value is parsed as local time in
 * whatever timezone the *server* runs in (UTC on Vercel), silently
 * shifting every event by 3 hours from what the organiser typed.
 */

const DATETIME_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** Parses a <input type="datetime-local"> value as Africa/Dar_es_Salaam
 * wall-clock time, returning the absolute UTC instant. Returns null for
 * anything that doesn't match the expected "YYYY-MM-DDTHH:mm" shape. */
export function parseTanzaniaLocalDateTime(value: string): Date | null {
  if (!DATETIME_LOCAL_PATTERN.test(value)) return null;
  const date = new Date(`${value}:00+03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Formats a stored ISO instant as Africa/Dar_es_Salaam wall-clock time
 * for display. */
export function formatTanzaniaDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Africa/Dar_es_Salaam",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Formats a stored ISO instant back into the "YYYY-MM-DDTHH:mm" shape a
 * <input type="datetime-local"> expects, in Africa/Dar_es_Salaam time, so
 * an edit form pre-fills with what the organiser originally typed. */
export function toDatetimeLocalValue(iso: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Dar_es_Salaam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
