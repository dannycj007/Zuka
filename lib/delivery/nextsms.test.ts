import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import { NextSmsProvider } from "./nextsms.ts";

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = globalThis.fetch;

beforeEach(() => {
  process.env.NEXTSMS_API_KEY = "test-key";
  delete process.env.NEXTSMS_SENDER_ID;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  globalThis.fetch = ORIGINAL_FETCH;
});

test("sends with the correct endpoint, Bearer auth, and payload shape", async () => {
  let capturedUrl: string | undefined;
  let capturedInit: RequestInit | undefined;

  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    capturedUrl = url;
    capturedInit = init;
    return new Response(JSON.stringify({ success: true, messageId: "abc123" }), {
      status: 200,
    });
  }) as typeof fetch;

  const provider = new NextSmsProvider();
  const result = await provider.send({ to: "+255700000000", text: "hello" });

  assert.equal(capturedUrl, "https://messaging-service.co.tz/api/sms/v1/text/single");
  assert.equal(capturedInit?.method, "POST");
  const headers = capturedInit?.headers as Record<string, string>;
  assert.equal(headers["Authorization"], "Bearer test-key");
  assert.equal(headers["Content-Type"], "application/json");
  const body = JSON.parse(capturedInit?.body as string);
  assert.deepEqual(body, { from: "ZUKA EVENTS", to: "255700000000", text: "hello" });

  assert.deepEqual(result, { ok: true, providerMessageId: "abc123" });
});

test("uses NEXTSMS_SENDER_ID when set instead of the default", async () => {
  process.env.NEXTSMS_SENDER_ID = "MICHANGO";
  let capturedBody: string | undefined;

  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    capturedBody = init?.body as string;
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }) as typeof fetch;

  const provider = new NextSmsProvider();
  await provider.send({ to: "255700000000", text: "hi" });

  assert.equal(JSON.parse(capturedBody!).from, "MICHANGO");
});

test("returns a config error and does not call fetch when the API key is missing", async () => {
  delete process.env.NEXTSMS_API_KEY;
  let fetchCalled = false;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    return new Response("", { status: 200 });
  }) as typeof fetch;

  const provider = new NextSmsProvider();
  const result = await provider.send({ to: "255700000000", text: "hi" });

  assert.equal(fetchCalled, false);
  assert.deepEqual(result, {
    ok: false,
    errorCode: "missing_api_key",
    errorMessage: "NEXTSMS_API_KEY is not configured.",
  });
});

test("surfaces a 4xx failure with the response's error message", async () => {
  globalThis.fetch = (async () => {
    return new Response(JSON.stringify({ success: false, status: 403, message: "Not Authorized" }), {
      status: 403,
    });
  }) as typeof fetch;

  const provider = new NextSmsProvider();
  const result = await provider.send({ to: "255700000000", text: "hi" });

  assert.deepEqual(result, {
    ok: false,
    errorCode: "403",
    errorMessage: "Not Authorized",
  });
});

test("surfaces a 5xx failure with a usable error message", async () => {
  globalThis.fetch = (async () => {
    return new Response(JSON.stringify({ message: "Internal Server Error" }), { status: 500 });
  }) as typeof fetch;

  const provider = new NextSmsProvider();
  const result = await provider.send({ to: "255700000000", text: "hi" });

  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.errorCode, "500");
});

test("returns a network error when fetch throws", async () => {
  globalThis.fetch = (async () => {
    throw new Error("connect ETIMEDOUT");
  }) as typeof fetch;

  const provider = new NextSmsProvider();
  const result = await provider.send({ to: "255700000000", text: "hi" });

  assert.deepEqual(result, {
    ok: false,
    errorCode: "network_error",
    errorMessage: "connect ETIMEDOUT",
  });
});

test("degrades gracefully when the error body isn't JSON", async () => {
  globalThis.fetch = (async () => {
    return new Response("<html>Bad Gateway</html>", { status: 502 });
  }) as typeof fetch;

  const provider = new NextSmsProvider();
  const result = await provider.send({ to: "255700000000", text: "hi" });

  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.errorCode, "502");
  assert.equal(!result.ok && result.errorMessage, "<html>Bad Gateway</html>");
});
