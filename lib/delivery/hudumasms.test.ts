import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import { HudumaSmsProvider } from "./hudumasms.ts";

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = globalThis.fetch;

// Real response bodies captured via curl against the user's live
// HudumaSMS account on 2026-10-10 (see DECISIONS.md) — not invented.
const REAL_SUCCESS_BODY = {
  credits_used: 1,
  data: {
    id: "13216a04-1cbf-4c8a-9ea2-c3fe264ce148",
    userId: "612c46e4-d5a7-4e36-b617-16fece3bfee9",
    senderId: null,
    senderName: "ZUKAEVENTS",
    recipientPhone: "255693188900",
    message: "Test from HudumaSMS API",
    status: "sent",
    messageId: "b67522f3-f642-46b3-ac29-5842273afda0",
    provider: null,
    credits: 1,
    parts: 1,
    encoding: "GSM-7",
    scheduledAt: null,
    sentAt: "2026-10-10T13:39:06.549414651Z",
    deliveredAt: null,
    failedAt: null,
    failureReason: null,
    metadata: {
      errorDetails: "",
      invalid: 0,
      message: "Message accepted",
      requestId: 0,
      statusCode: 201,
      success: true,
      valid: 1,
    },
    createdAt: "2026-10-10T15:39:06.545809Z",
    updatedAt: "2026-10-10T15:39:06.545809Z",
  },
  message: "Messages sent successfully",
};

const REAL_ERROR_BODY = { error: "Invalid or revoked API key" };

beforeEach(() => {
  process.env.HUDUMASMS_API_KEY = "test-key";
  delete process.env.HUDUMASMS_SENDER_NAME;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  globalThis.fetch = ORIGINAL_FETCH;
});

test("sends with the correct endpoint, X-API-Key auth, and payload shape", async () => {
  let capturedUrl: string | undefined;
  let capturedInit: RequestInit | undefined;

  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    capturedUrl = url;
    capturedInit = init;
    return new Response(JSON.stringify(REAL_SUCCESS_BODY), { status: 201 });
  }) as typeof fetch;

  const provider = new HudumaSmsProvider();
  const result = await provider.send({ to: "+255693188900", text: "Test from HudumaSMS API" });

  assert.equal(capturedUrl, "https://api.huduma.cloud/api/v1/sms/send");
  assert.equal(capturedInit?.method, "POST");
  const headers = capturedInit?.headers as Record<string, string>;
  assert.equal(headers["X-API-Key"], "test-key");
  assert.equal(headers["Content-Type"], "application/json");

  const body = JSON.parse(capturedInit?.body as string);
  assert.deepEqual(body, {
    senderName: "ZUKAEVENTS",
    recipientPhone: "255693188900",
    message: "Test from HudumaSMS API",
  });

  assert.deepEqual(result, {
    ok: true,
    providerMessageId: "b67522f3-f642-46b3-ac29-5842273afda0",
  });
});

test("uses HUDUMASMS_SENDER_NAME when set instead of the default", async () => {
  process.env.HUDUMASMS_SENDER_NAME = "SOMEOTHER";
  let capturedBody: string | undefined;

  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    capturedBody = init?.body as string;
    return new Response(JSON.stringify(REAL_SUCCESS_BODY), { status: 201 });
  }) as typeof fetch;

  const provider = new HudumaSmsProvider();
  await provider.send({ to: "255693188900", text: "hi" });

  assert.equal(JSON.parse(capturedBody!).senderName, "SOMEOTHER");
});

test("returns a config error and does not call fetch when the API key is missing", async () => {
  delete process.env.HUDUMASMS_API_KEY;
  let fetchCalled = false;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    return new Response("", { status: 200 });
  }) as typeof fetch;

  const provider = new HudumaSmsProvider();
  const result = await provider.send({ to: "255693188900", text: "hi" });

  assert.equal(fetchCalled, false);
  assert.deepEqual(result, {
    ok: false,
    errorCode: "missing_api_key",
    errorMessage: "HUDUMASMS_API_KEY is not configured.",
  });
});

test("surfaces a real 401 auth failure using the confirmed error shape", async () => {
  globalThis.fetch = (async () => {
    return new Response(JSON.stringify(REAL_ERROR_BODY), { status: 401 });
  }) as typeof fetch;

  const provider = new HudumaSmsProvider();
  const result = await provider.send({ to: "255693188900", text: "hi" });

  assert.deepEqual(result, {
    ok: false,
    errorCode: "401",
    errorMessage: "Invalid or revoked API key",
  });
});

test("returns a network error when fetch throws", async () => {
  globalThis.fetch = (async () => {
    throw new Error("connect ETIMEDOUT");
  }) as typeof fetch;

  const provider = new HudumaSmsProvider();
  const result = await provider.send({ to: "255693188900", text: "hi" });

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

  const provider = new HudumaSmsProvider();
  const result = await provider.send({ to: "255693188900", text: "hi" });

  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.errorCode, "502");
  assert.equal(!result.ok && result.errorMessage, "<html>Bad Gateway</html>");
});

test("returns a null providerMessageId if the success body is missing data.messageId", async () => {
  globalThis.fetch = (async () => {
    return new Response(JSON.stringify({ message: "ok" }), { status: 200 });
  }) as typeof fetch;

  const provider = new HudumaSmsProvider();
  const result = await provider.send({ to: "255693188900", text: "hi" });

  assert.deepEqual(result, { ok: true, providerMessageId: null });
});
