import { test } from "node:test";
import assert from "node:assert/strict";
import { getMapsUrl, getGoogleCalendarUrl, buildIcs } from "./invite-links.ts";

test("prefers lat/lng for the maps link when present", () => {
  const url = getMapsUrl({
    venueLat: -6.8161,
    venueLng: 39.2925,
    venueAddress: "Kivukoni Front",
    venueName: "Ledger Plaza",
  });
  assert.equal(url, "https://www.google.com/maps/search/?api=1&query=-6.8161,39.2925");
});

test("falls back to the address when lat/lng are missing", () => {
  const url = getMapsUrl({
    venueLat: null,
    venueLng: null,
    venueAddress: "Kivukoni Front, Dar es Salaam",
    venueName: "Ledger Plaza",
  });
  assert.equal(
    url,
    "https://www.google.com/maps/search/?api=1&query=Kivukoni%20Front%2C%20Dar%20es%20Salaam",
  );
});

test("falls back to the venue name when there's no address either", () => {
  const url = getMapsUrl({ venueLat: null, venueLng: null, venueAddress: null, venueName: "Ledger Plaza" });
  assert.equal(url, "https://www.google.com/maps/search/?api=1&query=Ledger%20Plaza");
});

test("returns null when there's nothing to link to", () => {
  const url = getMapsUrl({ venueLat: null, venueLng: null, venueAddress: null, venueName: null });
  assert.equal(url, null);
});

test("builds a Google Calendar link with a 3-hour default duration", () => {
  const url = getGoogleCalendarUrl({
    eventName: "Amina & Baraka's Wedding",
    startsAt: "2026-12-25T13:00:00.000Z",
    venueAddress: "Kivukoni Front",
    venueName: null,
  });
  const parsed = new URL(url);
  assert.equal(parsed.origin + parsed.pathname, "https://calendar.google.com/calendar/render");
  assert.equal(parsed.searchParams.get("dates"), "20261225T130000Z/20261225T160000Z");
  assert.equal(parsed.searchParams.get("text"), "Amina & Baraka's Wedding");
});

test("builds a valid ICS with escaped text and CRLF line endings", () => {
  const ics = buildIcs({
    eventName: "Amina, Baraka's Wedding",
    startsAt: "2026-12-25T13:00:00.000Z",
    venueAddress: "Kivukoni Front; Dar es Salaam",
    venueName: null,
  });
  assert.match(ics, /\r\n/);
  assert.match(ics, /SUMMARY:Amina\\, Baraka's Wedding/);
  assert.match(ics, /LOCATION:Kivukoni Front\\; Dar es Salaam/);
  assert.match(ics, /DTSTART:20261225T130000Z/);
  assert.match(ics, /DTEND:20261225T160000Z/);
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /END:VCALENDAR/);
});

test("ICS omits LOCATION entirely when there's no venue info", () => {
  const ics = buildIcs({
    eventName: "Just a title",
    startsAt: "2026-12-25T13:00:00.000Z",
    venueAddress: null,
    venueName: null,
  });
  assert.doesNotMatch(ics, /LOCATION:/);
});
