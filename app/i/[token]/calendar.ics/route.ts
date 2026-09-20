import { NextResponse } from "next/server";
import { loadInvite } from "../data";
import { buildIcs } from "@/lib/invite-links";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const invite = await loadInvite(token);

  if (!invite) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ics = buildIcs(invite);
  const safeName = invite.eventName.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName || "event"}.ics"`,
    },
  });
}
