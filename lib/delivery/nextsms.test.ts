import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { NextSmsProvider } from "./nextsms.ts";

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.NEXTSMS_API_KEY = "test-key";
  process.env.NEXTSMS_SENDER_ID = "ZUKA";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env = { ...originalEnv };
});

function mockFetch(response: { status: number; body: string }) {
  globalThis.fetch = (async () =>
    new Response(response.body, { status: response.status })) as typeof fetch;
}

test("sends with the confirmed endpoint, auth header, and payload shape", async () => {
  let capturedUrl: string | undefined;
  let capturedInit: RequestInit | undefined;
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    capturedUrl = url;
    capturedInit = init;
    return new Response(JSON.stringify({ messageId: "abc123" }), { status: 200 });
  }) as typeof fetch;

  const provider = new NextSmsProvider();
  const result = await provider.send({ to: "+255712345678", text: "Hello" });

  assert.equal(capturedUrl, "https://messaging-service.co.tz/api/sms/v1/text/single");
  assert.equal(capturedInit?.method, "POST");
  assert.equal(
    (capturedInit?.headers as Record<string, string>).Authorization,
    "Basic test-key",
  );
  const body = JSON.parse(capturedInit?.body as string);
  assert.deepEqual(body, { from: "ZUKA", to: "255712345678", text: "Hello" });
  assert.deepEqual(result, { ok: true, providerMessageId: "abc123" });
});

test("returns a config error without calling fetch when the API key is missing", async () => {
  delete process.env.NEXTSMS_API_KEY;
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    return new Response("{}", { status: 200 });
  }) as typeof fetch;

  const result = await new NextSmsProvider().send({ to: "+255712345678", text: "Hi" });
  assert.equal(called, false);
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.errorCode, "missing_api_key");
});

test("treats a 4xx response as a non-retriable failure", async () => {
  mockFetch({ status: 400, body: JSON.stringify({ message: "Sender ID not approved" }) });
  const result = await new NextSmsProvider().send({ to: "+255712345678", text: "Hi" });
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.retriable, false);
  assert.equal(result.ok === false && result.errorMessage, "Sender ID not approved");
});

test("treats a 5xx response as a retriable failure", async () => {
  mockFetch({ status: 503, body: "Service unavailable" });
  const result = await new NextSmsProvider().send({ to: "+255712345678", text: "Hi" });
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.retriable, true);
});

test("treats a network error as a retriable failure", async () => {
  globalThis.fetch = (async () => {
    throw new Error("getaddrinfo ENOTFOUND");
  }) as typeof fetch;
  const result = await new NextSmsProvider().send({ to: "+255712345678", text: "Hi" });
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.retriable, true);
  assert.equal(result.ok === false && result.errorCode, "network_error");
});

test("degrades gracefully when the error body isn't JSON", async () => {
  mockFetch({ status: 500, body: "<html>Internal Server Error</html>" });
  const result = await new NextSmsProvider().send({ to: "+255712345678", text: "Hi" });
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.errorMessage, "<html>Internal Server Error</html>");
});
