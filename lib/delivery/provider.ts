/**
 * Channel-agnostic delivery interface (decision 5.2: build this way so
 * WhatsApp can slot in later without touching the send action or
 * delivery_events schema).
 */

export type SendMessageInput = {
  to: string;
  /** Full message body. Used as-is by NextSmsProvider (free-form SMS).
   * Ignored by WhatsAppProvider, which must send a pre-approved template
   * instead (Meta only allows free-form text within a 24h customer
   * service window, which doesn't apply to an organiser-initiated
   * invite) — use templateParams/language for that. */
  text: string;
  /** Ordered values substituted into the approved template's {{1}},
   * {{2}}, ... body placeholders. WhatsAppProvider-only. */
  templateParams?: string[];
  /** The app's own language code ("en" | "sw") for picking which
   * template translation to send. WhatsAppProvider-only — it maps this
   * to WhatsApp's own language codes internally (notably "sw" -> "swa",
   * not the ISO 639-1 code most other providers use). */
  language?: string;
};

export type SendMessageResult =
  | { ok: true; providerMessageId: string | null }
  | { ok: false; errorCode: string | null; errorMessage: string };

export type DeliveryChannelName = "sms" | "whatsapp";
export type DeliveryProviderName = "nextsms" | "whatsapp";

export interface DeliveryProvider {
  readonly channel: DeliveryChannelName;
  readonly providerName: DeliveryProviderName;
  send(input: SendMessageInput): Promise<SendMessageResult>;
}
