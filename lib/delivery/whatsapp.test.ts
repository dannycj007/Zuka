import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import { WhatsAppProvider } from "./whatsapp.ts";

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = globalThis.fetch;

beforeEach(() => {
  process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "1234567890";
  process.env.WHATSAPP_TEMPLATE_NAME = "event_invite";
  delete process.env.WHATSAPP_API_VERSION;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  globalThis.fetch = ORIGINAL_FETCH;
});

test("sends a template message with the correct endpoint, auth, and payload shape", async () => {
  let capturedUrl: string | undefined;
  let capturedInit: RequestInit | undefined;

  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    capturedUrl = url;
    capturedInit = init;
    return new Response(
      JSON.stringify({
        messaging_product: "whatsapp",
        contacts: [{ input: "255700000000", wa_id: "255700000000" }],
        messages: [{ id: "wamid.abc123", message_status: "accepted" }],
      }),
      { status: 200 },
    );
  }) as typeof fetch;

  const provider = new WhatsAppProvider();
  const result = await provider.send({
    to: "+255700000000",
    text: "",
    templateParams: ["Grace", "Amina & Baraka's Wedding", "https://zuka.app/i/tok123"],
    language: "en",
  });

  assert.equal(capturedUrl, "https://graph.facebook.com/v23.0/1234567890/messages");
  assert.equal(capturedInit?.method, "POST");
  const headers = capturedInit?.headers as Record<string, string>;
  assert.equal(headers["Authorization"], "Bearer test-token");
  assert.equal(headers["Content-Type"], "application/json");

  const body = JSON.parse(capturedInit?.body as string);
  assert.deepEqual(body, {
    messaging_product: "whatsapp",
    to: "255700000000",
    type: "template",
    template: {
      name: "event_invite",
      language: { code: "en_US" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: "Grace" },
            { type: "text", text: "Amina & Baraka's Wedding" },
            { type: "text", text: "https://zuka.app/i/tok123" },
          ],
        },
      ],
    },
  });

  assert.deepEqual(result, { ok: true, providerMessageId: "wamid.abc123" });
});

test("maps Swahili to WhatsApp's 'swa' code, not 'sw'", async () => {
  let capturedBody: string | undefined;
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    capturedBody = init?.body as string;
    return new Response(JSON.stringify({ messages: [{ id: "x" }] }), { status: 200 });
  }) as typeof fetch;

  const provider = new WhatsAppProvider();
  await provider.send({ to: "255700000000", text: "", templateParams: ["a", "b", "c"], language: "sw" });

  assert.equal(JSON.parse(capturedBody!).template.language.code, "swa");
});

test("defaults to English when language is missing", async () => {
  let capturedBody: string | undefined;
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    capturedBody = init?.body as string;
    return new Response(JSON.stringify({ messages: [{ id: "x" }] }), { status: 200 });
  }) as typeof fetch;

  const provider = new WhatsAppProvider();
  await provider.send({ to: "255700000000", text: "", templateParams: ["a", "b", "c"] });

  assert.equal(JSON.parse(capturedBody!).template.language.code, "en_US");
});

test("respects WHATSAPP_API_VERSION when set", async () => {
  process.env.WHATSAPP_API_VERSION = "v20.0";
  let capturedUrl: string | undefined;
  globalThis.fetch = (async (url: string) => {
    capturedUrl = url;
    return new Response(JSON.stringify({ messages: [{ id: "x" }] }), { status: 200 });
  }) as typeof fetch;

  const provider = new WhatsAppProvider();
  await provider.send({ to: "255700000000", text: "", templateParams: [] });

  assert.equal(capturedUrl, "https://graph.facebook.com/v20.0/1234567890/messages");
});

test("returns a config error and does not call fetch when credentials are missing", async () => {
  delete process.env.WHATSAPP_ACCESS_TOKEN;
  let fetchCalled = false;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    return new Response("", { status: 200 });
  }) as typeof fetch;

  const provider = new WhatsAppProvider();
  const result = await provider.send({ to: "255700000000", text: "", templateParams: [] });

  assert.equal(fetchCalled, false);
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.errorCode, "missing_config");
  assert.equal(!result.ok && result.errorMessage.includes("WHATSAPP_ACCESS_TOKEN"), true);
});

test("surfaces a template/auth failure using error_data.details", async () => {
  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({
        error: {
          message: "(#132001) Template name does not exist in the translation",
          type: "OAuthException",
          code: 132001,
          error_data: { messaging_product: "whatsapp", details: "Template name does not exist in the translation" },
          fbtrace_id: "AbCdEf123",
        },
      }),
      { status: 400 },
    );
  }) as typeof fetch;

  const provider = new WhatsAppProvider();
  const result = await provider.send({ to: "255700000000", text: "", templateParams: [] });

  assert.deepEqual(result, {
    ok: false,
    errorCode: "132001",
    errorMessage: "Template name does not exist in the translation",
  });
});

test("returns a network error when fetch throws", async () => {
  globalThis.fetch = (async () => {
    throw new Error("connect ETIMEDOUT");
  }) as typeof fetch;

  const provider = new WhatsAppProvider();
  const result = await provider.send({ to: "255700000000", text: "", templateParams: [] });

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

  const provider = new WhatsAppProvider();
  const result = await provider.send({ to: "255700000000", text: "", templateParams: [] });

  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.errorCode, "502");
  assert.equal(!result.ok && result.errorMessage, "<html>Bad Gateway</html>");
});
