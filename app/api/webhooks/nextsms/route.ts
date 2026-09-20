import { NextResponse } from "next/server";

/**
 * Deliberately not implemented yet. The brief requires webhook endpoints
 * to verify provider signatures and be idempotent — doing that requires
 * knowing NextSMS's actual signing scheme and delivery-callback payload
 * shape, which isn't documented anywhere accessible right now (their own
 * site is blocked by this sandbox's network policy, and no third-party
 * source has it).
 *
 * Returning 501 here is intentional: accepting POSTs without real
 * signature verification would mean anyone who finds this URL could
 * inject fake delivery statuses into delivery_events. That's worse than
 * this endpoint not existing yet.
 *
 * To finish this: get NextSMS's delivery-report/webhook documentation
 * (dashboard or account rep), then implement signature verification and
 * an idempotent upsert into delivery_events keyed on provider_message_id
 * + status (providers retry callbacks, so the same one can arrive more
 * than once).
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "NextSMS webhook handling isn't implemented yet — see the comment in this route's source.",
    },
    { status: 501 },
  );
}
