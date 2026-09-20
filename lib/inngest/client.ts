import { Inngest } from "inngest";

/**
 * This SDK version has no typed-events builder (checked: no
 * EventSchemas/schemas export exists in node_modules/inngest). Event
 * payloads are validated manually where they're read instead.
 */
export const inngest = new Inngest({ id: "zukaevents" });

export type GuestInviteSendEvent = {
  name: "guest/invite.send";
  data: {
    guestId: string;
    attemptNumber: number;
  };
};
