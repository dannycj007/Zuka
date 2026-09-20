import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLatLngFromText, resolveGoogleMapsLocation } from "./google-maps-link.ts";

test("parses bare 'lat,lng' text", () => {
  assert.deepEqual(parseLatLngFromText("-6.8161, 39.2925"), { lat: -6.8161, lng: 39.2925 });
});

test("parses the @lat,lng,zoom pattern from a full Maps URL", () => {
  const url = "https://www.google.com/maps/place/Ledger+Plaza/@-6.8161,39.2925,17z/data=...";
  assert.deepEqual(parseLatLngFromText(url), { lat: -6.8161, lng: 39.2925 });
});

test("parses ?q=lat,lng search links", () => {
  const url = "https://www.google.com/maps?q=-6.8161,39.2925";
  assert.deepEqual(parseLatLngFromText(url), { lat: -6.8161, lng: 39.2925 });
});

test("prefers the !3d!4d pin location over the @ map-center when both are present", () => {
  const url =
    "https://www.google.com/maps/place/Ledger+Plaza/@-6.81,39.29,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d-6.8161!4d39.2925";
  assert.deepEqual(parseLatLngFromText(url), { lat: -6.8161, lng: 39.2925 });
});

test("returns null for text with no recognizable coordinates", () => {
  assert.equal(parseLatLngFromText("Ledger Plaza Garden, Dar es Salaam"), null);
  assert.equal(parseLatLngFromText(""), null);
});

test("rejects out-of-range numbers even if they match the shape", () => {
  assert.equal(parseLatLngFromText("200, 39.29"), null);
  assert.equal(parseLatLngFromText("-6.81, 400"), null);
});

test("resolveGoogleMapsLocation: empty input resolves to null without a network call", async () => {
  assert.equal(await resolveGoogleMapsLocation(""), null);
  assert.equal(await resolveGoogleMapsLocation("   "), null);
});

test("resolveGoogleMapsLocation: resolves directly from a full URL, no fetch needed", async () => {
  const result = await resolveGoogleMapsLocation(
    "https://www.google.com/maps/place/@-6.8161,39.2925,17z",
  );
  assert.deepEqual(result, { lat: -6.8161, lng: 39.2925 });
});

test("resolveGoogleMapsLocation: unrecognized plain text resolves to null", async () => {
  assert.equal(await resolveGoogleMapsLocation("Ledger Plaza Garden"), null);
});
