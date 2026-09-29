import { NextResponse, type NextRequest } from "next/server";

/**
 * WhatsApp Cloud API webhook receiver (decision 5.2's 2026-09-29
 * addition — see DECISIONS.md).
 *
 * GET handles Meta's subscription verification handshake, fully
 * implemented: when you paste this URL into the Meta App Dashboard's
 * "Configure Webhooks" step and click "Verify and save", Meta sends
 *   GET ?hub.mode=subscribe&hub.challenge=<random>&hub.verify_token=<your token>
 * and expects the raw hub.challenge value echoed back with a 200 if
 * hub.verify_token matches. Unlike NextSMS's webhook (still a 501 stub —
 * their delivery-callback docs aren't accessible from here), this one
 * is real: the handshake protocol is standard across Meta's platform
 * and independently confirmed via multiple sources, not a single
 * unverified blog post.
 *
 * POST (actual delivery/read status + inbound message events) is
 * intentionally still a stub. It returns 200 immediately — Meta expects
 * a fast 200 and can disable a webhook subscription that doesn't give
 * one — but doesn't process the payload into delivery_events yet. To
 * finish this: verify the X-Hub-Signature-256 header (HMAC-SHA256 over
 * the raw body using the app secret) before trusting anything in it,
 * then for each entry[].changes[].value.statuses[] entry, look up the
 * delivery_events row by provider_message_id and upsert a new status
 * row idempotently (Meta retries webhook deliveries, so the same status
 * event can arrive more than once).
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const challenge = params.get("hub.challenge");
  const token = params.get("hub.verify_token");

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (!expectedToken) {
    return NextResponse.json(
      { error: "WHATSAPP_WEBHOOK_VERIFY_TOKEN is not configured." },
      { status: 500 },
    );
  }

  if (mode === "subscribe" && token === expectedToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed." }, { status: 403 });
}

export async function POST() {
  return NextResponse.json({ received: true }, { status: 200 });
}
