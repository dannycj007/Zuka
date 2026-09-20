import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseTanzaniaLocalDateTime,
  formatTanzaniaDateTime,
  toDatetimeLocalValue,
} from "./tanzania-time.ts";

test("parses a datetime-local value as Africa/Dar_es_Salaam (UTC+3), not server-local", () => {
  const date = parseTanzaniaLocalDateTime("2026-12-25T16:00");
  assert.ok(date);
  // 16:00 EAT == 13:00 UTC
  assert.equal(date?.toISOString(), "2026-12-25T13:00:00.000Z");
});

test("rejects malformed datetime-local input", () => {
  assert.equal(parseTanzaniaLocalDateTime("not a date"), null);
  assert.equal(parseTanzaniaLocalDateTime("2026-12-25"), null);
});

test("round-trips an ISO instant through toDatetimeLocalValue and back", () => {
  const original = "2026-12-25T13:00:00.000Z";
  const local = toDatetimeLocalValue(original);
  assert.equal(local, "2026-12-25T16:00");
  const reparsed = parseTanzaniaLocalDateTime(local);
  assert.equal(reparsed?.toISOString(), original);
});

test("formats an instant as readable Africa/Dar_es_Salaam time", () => {
  const formatted = formatTanzaniaDateTime("2026-12-25T13:00:00.000Z");
  // Exact locale punctuation can vary by ICU version; just check the hour
  // landed on 16:xx (EAT), not 13:xx (UTC).
  assert.match(formatted, /16:00/);
});
