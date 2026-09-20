/**
 * Channel-agnostic delivery interface (decision 5.2: build this way so
 * WhatsApp can slot in later without touching the queue, webhook
 * handling, or delivery_events schema). SMS via NextSMS is the only
 * implementation in v1.
 */

export type SendMessageInput = {
  to: string;
  text: string;
};

export type SendMessageResult =
  | { ok: true; providerMessageId: string | null }
  | { ok: false; errorCode: string | null; errorMessage: string; retriable: boolean };

export type DeliveryChannelName = "sms" | "whatsapp";
export type DeliveryProviderName = "nextsms" | "whatsapp";

export interface DeliveryProvider {
  readonly channel: DeliveryChannelName;
  readonly providerName: DeliveryProviderName;
  send(input: SendMessageInput): Promise<SendMessageResult>;
}
