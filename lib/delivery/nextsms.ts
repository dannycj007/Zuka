import type { DeliveryProvider, SendMessageInput, SendMessageResult } from "./provider";

const NEXTSMS_ENDPOINT = "https://messaging-service.co.tz/api/sms/v1/text/single";

/**
 * NextSMS adapter. The endpoint, auth header shape, and request body
 * below are confirmed from NextSMS's own "integrate in 5 minutes" guide:
 *
 *   POST https://messaging-service.co.tz/api/sms/v1/text/single
 *   Authorization: Basic <API_KEY>
 *   { "from": "<sender id>", "to": "<255XXXXXXXXX>", "text": "..." }
 *
 * What is NOT verified anywhere we could check (nextsms.co.tz itself is
 * blocked by this sandbox's network policy, and no third-party source
 * documents it): the exact success/error response JSON shape, and
 * whether NEXTSMS_SENDER_ID being unapproved surfaces as a specific
 * error code or just a generic 4xx. parseErrorBody()/extractMessageId()
 * below are deliberately defensive — they don't assume a specific field
 * name, they look for the common ones and fall back to the raw body —
 * so an unexpected shape degrades to "logged with a slightly less tidy
 * error string," never a crash or a silently-dropped failure.
 *
 * Revisit this once real NextSMS API docs are available (see README).
 */
export class NextSmsProvider implements DeliveryProvider {
  readonly channel = "sms" as const;
  readonly providerName = "nextsms" as const;

  async send({ to, text }: SendMessageInput): Promise<SendMessageResult> {
    const apiKey = process.env.NEXTSMS_API_KEY;
    const senderId = process.env.NEXTSMS_SENDER_ID || "ZUKA";

    if (!apiKey) {
      return {
        ok: false,
        errorCode: "missing_api_key",
        errorMessage: "NEXTSMS_API_KEY is not configured.",
        retriable: false,
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
          Authorization: `Basic ${apiKey}`,
        },
        body: JSON.stringify({ from: senderId, to: toDigits, text }),
      });
    } catch (error) {
      return {
        ok: false,
        errorCode: "network_error",
        errorMessage: error instanceof Error ? error.message : "Network error calling NextSMS.",
        retriable: true,
      };
    }

    const rawBody = await response.text();
    const body = parseJsonSafe(rawBody);

    if (!response.ok) {
      return {
        ok: false,
        errorCode: String(response.status),
        errorMessage: summarizeErrorBody(body) ?? `NextSMS returned HTTP ${response.status}.`,
        // A not-yet-approved sender ID, a bad number, or a rejected
        // request are all 4xx and won't succeed on retry. Only treat
        // NextSMS-side failures (5xx) as worth retrying.
        retriable: response.status >= 500,
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
