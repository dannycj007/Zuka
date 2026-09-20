import { NonRetriableError } from "inngest";
import { inngest, type GuestInviteSendEvent } from "./client";
import { NextSmsProvider } from "@/lib/delivery/nextsms";
import { getInviteSmsText } from "@/lib/i18n";
import { loadGuestForSend, recordDeliveryEvent } from "@/lib/delivery/delivery-log";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

export const sendGuestInvite = inngest.createFunction(
  { id: "send-guest-invite", retries: 2, triggers: [{ event: "guest/invite.send" }] },
  async ({ event, step }) => {
    const { guestId, attemptNumber } = event.data as GuestInviteSendEvent["data"];

    const context = await step.run("load-guest", () => loadGuestForSend(guestId));
    if (!context) {
      throw new NonRetriableError(`Guest ${guestId} not found — nothing to send.`);
    }

    if (!SITE_URL) {
      // Distinct from a provider failure: this is a deployment config
      // problem, not something retrying will fix, and not something to
      // report to the organiser as "the guest's number failed."
      await step.run("record-config-error", () =>
        recordDeliveryEvent({
          guestId: context.guestId,
          eventId: context.eventId,
          channel: "sms",
          provider: "nextsms",
          status: "failed",
          attemptNumber,
          errorCode: "missing_site_url",
          errorMessage: "NEXT_PUBLIC_SITE_URL is not configured — can't build an invite link.",
        }),
      );
      throw new NonRetriableError("NEXT_PUBLIC_SITE_URL is not configured.");
    }

    await step.run("send-and-log", async () => {
      const inviteUrl = `${SITE_URL}/i/${context.inviteToken}`;
      const text = getInviteSmsText(context.language, context.fullName, context.eventName, inviteUrl);

      const result = await new NextSmsProvider().send({ to: context.phoneE164, text });

      await recordDeliveryEvent({
        guestId: context.guestId,
        eventId: context.eventId,
        channel: "sms",
        provider: "nextsms",
        status: result.ok ? "sent" : "failed",
        attemptNumber,
        providerMessageId: result.ok ? result.providerMessageId : null,
        errorCode: result.ok ? null : result.errorCode,
        errorMessage: result.ok ? null : result.errorMessage,
      });

      if (!result.ok && result.retriable) {
        // Throwing here (inside step.run, not caught) triggers Inngest's
        // own retry for transient failures only (network errors, 5xx).
        // A permanent failure (bad number, unapproved sender, 4xx) is
        // already logged above and deliberately doesn't throw — the
        // organiser retries those manually from the delivery status
        // view, not automatically.
        throw new Error(result.errorMessage);
      }
    });
  },
);
