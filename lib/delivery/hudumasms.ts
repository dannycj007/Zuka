import type { DeliveryProvider, SendMessageInput, SendMessageResult } from "./provider";

const HUDUMASMS_ENDPOINT = "https://api.huduma.cloud/api/v1/sms/send";

/**
 * HudumaSMS adapter (decision 5.1's 2026-10-10 provider swap — see
 * DECISIONS.md). Replaces NextSMS, whose sender ID never got approved
 * despite weeks of live debugging.
 *
 *   POST https://api.huduma.cloud/api/v1/sms/send
 *   X-API-Key: <key>   (from the dashboard's Developer > API Keys tab)
 *   Content-Type: application/json
 *   { "senderName": "<sender id>", "recipientPhone": "<255XXXXXXXXX>", "message": "..." }
 *
 * Unlike NextSMS (whose shape came from a wrong blog post, then had to
 * be corrected through a long live-debugging saga) and unlike
 * WhatsAppProvider (whose shape came from web search since Meta's docs
 * are unreachable from this sandbox), every detail here is confirmed
 * directly from the user's own two live curl tests against their real
 * account on 2026-10-10 — not inferred, not guessed.
 *
 * Confirmed success shape (HTTP 2xx):
 *   {"credits_used":1,"data":{"id":"...","messageId":"...","status":"sent",
 *    "senderName":"ZUKAEVENTS","recipientPhone":"...","metadata":{...},...},
 *    "message":"Messages sent successfully"}
 * `data.messageId` is the id this app stores as providerMessageId — it's
 * also what GET /sms/:messageId (not yet used by this app) expects for a
 * later delivery-status lookup, not `data.id`.
 *
 * Confirmed error shape (HTTP 401 for a bad key — no other failure mode
 * tested yet, e.g. an invalid phone number or insufficient credit might
 * have a different shape; handled defensively either way):
 *   {"error":"Invalid or revoked API key"}
 */
export class HudumaSmsProvider implements DeliveryProvider {
  readonly channel = "sms" as const;
  readonly providerName = "hudumasms" as const;

  async send({ to, text }: SendMessageInput): Promise<SendMessageResult> {
    const apiKey = process.env.HUDUMASMS_API_KEY;
    const senderName = process.env.HUDUMASMS_SENDER_NAME || "ZUKAEVENTS";

    if (!apiKey) {
      return {
        ok: false,
        errorCode: "missing_api_key",
        errorMessage: "HUDUMASMS_API_KEY is not configured.",
      };
    }

    // Confirmed example payload uses "255700000000", no leading '+'.
    const toDigits = to.replace(/^\+/, "");

    let response: Response;
    try {
      response = await fetch(HUDUMASMS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({ senderName, recipientPhone: toDigits, message: text }),
      });
    } catch (error) {
      return {
        ok: false,
        errorCode: "network_error",
        errorMessage: error instanceof Error ? error.message : "Network error calling HudumaSMS.",
      };
    }

    const rawBody = await response.text();
    const body = parseJsonSafe(rawBody);

    if (!response.ok) {
      return {
        ok: false,
        errorCode: String(response.status),
        errorMessage: summarizeErrorBody(body) ?? `HudumaSMS returned HTTP ${response.status}.`,
      };
    }

    return { ok: true, providerMessageId: extractMessageId(body) };
  }
}

function parseJsonSafe(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function summarizeErrorBody(body: unknown): string | null {
  if (!body) return null;
  if (typeof body === "string") return body.slice(0, 500);
  if (typeof body === "object") {
    const record = body as Record<string, unknown>;
    const candidate = record.error ?? record.message ?? record.detail;
    if (typeof candidate === "string") return candidate;
    return JSON.stringify(body).slice(0, 500);
  }
  return null;
}

function extractMessageId(body: unknown): string | null {
  if (body && typeof body === "object" && "data" in body) {
    const data = (body as { data?: unknown }).data;
    if (data && typeof data === "object") {
      const messageId = (data as Record<string, unknown>).messageId;
      if (typeof messageId === "string") return messageId;
    }
  }
  return null;
}
