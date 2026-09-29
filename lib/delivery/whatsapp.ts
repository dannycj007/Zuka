import type { DeliveryProvider, SendMessageInput, SendMessageResult } from "./provider";

const DEFAULT_API_VERSION = "v23.0";

/**
 * WhatsApp's own language codes for template translations don't always
 * match ISO 639-1 (what the rest of this app uses via Lang = "en"|"sw").
 * Verified via Meta's supported-languages docs (mirrored by several BSPs
 * since developers.facebook.com is unreachable from this environment):
 * Swahili is "swa", not "sw" — a wrong code here fails silently as
 * "template not found" rather than an obvious auth error, so this map is
 * deliberately explicit rather than assumed.
 */
const WHATSAPP_LANGUAGE_CODES: Record<string, string> = {
  en: "en_US",
  sw: "swa",
};

/**
 * WhatsApp Business Platform (Meta Cloud API) adapter — decision 5.2's
 * "later, isolated addition" (see DECISIONS.md, 2026-09-29).
 *
 *   POST https://graph.facebook.com/{version}/{PHONE_NUMBER_ID}/messages
 *   Authorization: Bearer <system user access token>
 *   Content-Type: application/json
 *   {
 *     "messaging_product": "whatsapp",
 *     "to": "<255XXXXXXXXX>",
 *     "type": "template",
 *     "template": {
 *       "name": "<approved template name>",
 *       "language": { "code": "en_US" | "swa" },
 *       "components": [{ "type": "body", "parameters": [{ "type": "text", "text": "..." }, ...] }]
 *     }
 *   }
 *
 * Must be a template message, not free text: Meta only allows
 * business-initiated messages via a pre-approved template outside the
 * 24-hour customer-service window, and an organiser sending an invite is
 * always business-initiated (the guest hasn't messaged first). See
 * README's "WhatsApp (Meta Cloud API)" section for what to submit for
 * approval and the real compliance/testing constraints (template
 * category, test-number limit before Business Verification).
 *
 * Response shapes confirmed from Meta's own docs (mirrored across
 * multiple sources, cross-checked since the primary domain is
 * unreachable here):
 *   success: {"messaging_product":"whatsapp","contacts":[{"input":"...","wa_id":"..."}],"messages":[{"id":"...","message_status":"accepted"}]}
 *   error:   {"error":{"message":"...","type":"...","code":100,"error_data":{"details":"..."},"fbtrace_id":"..."}}
 */
export class WhatsAppProvider implements DeliveryProvider {
  readonly channel = "whatsapp" as const;
  readonly providerName = "whatsapp" as const;

  async send({ to, templateParams, language }: SendMessageInput): Promise<SendMessageResult> {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
    const apiVersion = process.env.WHATSAPP_API_VERSION || DEFAULT_API_VERSION;

    if (!accessToken || !phoneNumberId || !templateName) {
      const missing = [
        !accessToken && "WHATSAPP_ACCESS_TOKEN",
        !phoneNumberId && "WHATSAPP_PHONE_NUMBER_ID",
        !templateName && "WHATSAPP_TEMPLATE_NAME",
      ]
        .filter(Boolean)
        .join(", ");
      return {
        ok: false,
        errorCode: "missing_config",
        errorMessage: `${missing} not configured.`,
      };
    }

    const languageCode = WHATSAPP_LANGUAGE_CODES[language ?? "en"] ?? WHATSAPP_LANGUAGE_CODES.en;
    const toDigits = to.replace(/^\+/, "");
    const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: toDigits,
          type: "template",
          template: {
            name: templateName,
            language: { code: languageCode },
            components: [
              {
                type: "body",
                parameters: (templateParams ?? []).map((text) => ({ type: "text", text })),
              },
            ],
          },
        }),
      });
    } catch (error) {
      return {
        ok: false,
        errorCode: "network_error",
        errorMessage: error instanceof Error ? error.message : "Network error calling WhatsApp.",
      };
    }

    const rawBody = await response.text();
    const body = parseJsonSafe(rawBody);

    if (!response.ok) {
      return {
        ok: false,
        errorCode: extractErrorCode(body) ?? String(response.status),
        errorMessage: extractErrorMessage(body) ?? `WhatsApp returned HTTP ${response.status}.`,
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

function extractErrorCode(body: unknown): string | null {
  if (body && typeof body === "object" && "error" in body) {
    const err = (body as { error?: unknown }).error;
    if (err && typeof err === "object" && "code" in err) {
      const code = (err as { code?: unknown }).code;
      if (typeof code === "number" || typeof code === "string") return String(code);
    }
  }
  return null;
}

function extractErrorMessage(body: unknown): string | null {
  if (body && typeof body === "object" && "error" in body) {
    const err = (body as { error?: unknown }).error;
    if (err && typeof err === "object") {
      const record = err as Record<string, unknown>;
      const details = record.error_data && typeof record.error_data === "object"
        ? (record.error_data as Record<string, unknown>).details
        : undefined;
      if (typeof details === "string") return details;
      if (typeof record.message === "string") return record.message;
    }
  }
  if (typeof body === "string") return body.slice(0, 500);
  return null;
}

function extractMessageId(body: unknown): string | null {
  if (body && typeof body === "object" && "messages" in body) {
    const messages = (body as { messages?: unknown }).messages;
    if (Array.isArray(messages) && messages[0] && typeof messages[0] === "object") {
      const id = (messages[0] as Record<string, unknown>).id;
      if (typeof id === "string") return id;
    }
  }
  return null;
}
