import type { DeliveryProvider, SendMessageInput, SendMessageResult } from "./provider";

const NEXTSMS_ENDPOINT = "https://messaging-service.co.tz/api/sms/v1/text/single";

/**
 * NextSMS adapter, corrected from live testing on 2026-09-23 (see
 * DECISIONS.md):
 *
 *   POST https://messaging-service.co.tz/api/sms/v1/text/single
 *   Authorization: Bearer <token>   (from their dashboard: Customer Info
 *                                    -> Customization -> API Keys)
 *   Content-Type: application/json
 *   { "from": "<sender id>", "to": "<255XXXXXXXXX>", "text": "..." }
 *
 * An earlier version of this file used `Authorization: Basic <key>`
 * based on a public blog post that turned out to be wrong — NextSMS's
 * real Basic auth option (an alternative to Bearer) needs
 * base64(username:password) like standard HTTP Basic auth, not a bare
 * key. Bearer is what NextSMS's own docs recommend and what's used here.
 *
 * Confirmed error shape (from a real 403 response during live testing):
 * `{"success":false,"status":403,"message":"..."}`. Success shape is
 * still unconfirmed — no successful send has happened yet, blocked on
 * NextSMS approving the registered sender ID (see README). Handled
 * defensively below either way.
 */
export class NextSmsProvider implements DeliveryProvider {
  readonly channel = "sms" as const;
  readonly providerName = "nextsms" as const;

  async send({ to, text }: SendMessageInput): Promise<SendMessageResult> {
    const apiKey = process.env.NEXTSMS_API_KEY;
    const senderId = process.env.NEXTSMS_SENDER_ID || "ZUKA EVENTS";

    if (!apiKey) {
      return {
        ok: false,
        errorCode: "missing_api_key",
        errorMessage: "NEXTSMS_API_KEY is not configured.",
      };
    }

    // The confirmed example payload uses "255700000000", no leading '+'.
    const toDigits = to.replace(/^\+/, "");

    let response: Response;
    try {
      response = await fetch(NEXTSMS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ from: senderId, to: toDigits, text }),
      });
    } catch (error) {
      return {
        ok: false,
        errorCode: "network_error",
        errorMessage: error instanceof Error ? error.message : "Network error calling NextSMS.",
      };
    }

    const rawBody = await response.text();
    const body = parseJsonSafe(rawBody);

    if (!response.ok) {
      return {
        ok: false,
        errorCode: String(response.status),
        errorMessage: summarizeErrorBody(body) ?? `NextSMS returned HTTP ${response.status}.`,
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
    const candidate = record.message ?? record.error ?? record.detail;
    if (typeof candidate === "string") return candidate;
    return JSON.stringify(body).slice(0, 500);
  }
  return null;
}

function extractMessageId(body: unknown): string | null {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const candidate = record.messageId ?? record.id ?? record.message_id;
    if (typeof candidate === "string") return candidate;
  }
  return null;
}
