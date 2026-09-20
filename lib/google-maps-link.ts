/**
 * Extracts precise coordinates from whatever an organiser pastes: a full
 * Google Maps URL, a shortened share link (maps.app.goo.gl), or bare
 * "lat,lng" text. No Google API key involved — just pattern-matching the
 * URL formats Google Maps itself produces, plus following the one
 * redirect a shortened share link needs to reveal its real URL.
 */

const BARE_PATTERN = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;
// .../@-6.8161,39.2925,17z/...  (the map's current center, most common)
const AT_PATTERN = /@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/;
// ...?q=-6.8161,39.2925  (search/pin links)
const QUERY_PATTERN = /[?&]q=(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/;
// ...!3d-6.8161!4d39.2925...  (the pin's exact location on a place page,
// more precise than the @ pattern when both are present)
const BANG_PATTERN = /!3d(-?\d{1,2}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/;

function inRange(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function parseLatLngFromText(
  input: string,
): { lat: number; lng: number } | null {
  const bare = input.match(BARE_PATTERN);
  if (bare) {
    const lat = Number(bare[1]);
    const lng = Number(bare[2]);
    if (inRange(lat, lng)) return { lat, lng };
  }

  // Prefer the !3d/!4d pin location when present — it's the actual
  // marked place, not just wherever the map happened to be centered.
  const bang = input.match(BANG_PATTERN);
  if (bang) {
    const lat = Number(bang[1]);
    const lng = Number(bang[2]);
    if (inRange(lat, lng)) return { lat, lng };
  }

  const query = input.match(QUERY_PATTERN);
  if (query) {
    const lat = Number(query[1]);
    const lng = Number(query[2]);
    if (inRange(lat, lng)) return { lat, lng };
  }

  const at = input.match(AT_PATTERN);
  if (at) {
    const lat = Number(at[1]);
    const lng = Number(at[2]);
    if (inRange(lat, lng)) return { lat, lng };
  }

  return null;
}

function isShortLink(url: URL): boolean {
  return /(^|\.)goo\.gl$/.test(url.hostname);
}

/**
 * Resolves whatever the organiser pasted into coordinates. Returns null
 * for empty input or anything unrecognized — the caller decides how to
 * surface that (this never throws for bad input, only for a genuine
 * network failure while following a short link's redirect).
 */
export async function resolveGoogleMapsLocation(
  input: string,
): Promise<{ lat: number; lng: number } | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const direct = parseLatLngFromText(trimmed);
  if (direct) return direct;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (isShortLink(url)) {
    const response = await fetch(url, { redirect: "follow" });
    return parseLatLngFromText(response.url);
  }

  return null;
}
