import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadInvite } from "./data";
import { parseThemeConfig, themeCssVars } from "@/lib/theme";
import { getDictionary, toClientDictionary } from "@/lib/i18n";
import { generateQrSvg } from "@/lib/qr";
import { formatTanzaniaDateTime } from "@/lib/tanzania-time";
import { getMapsUrl, getMapEmbedUrl, getGoogleCalendarUrl } from "@/lib/invite-links";
import { getSiteUrl } from "@/lib/site-url";
import { Countdown } from "./countdown";
import { RsvpButtons } from "./rsvp-buttons";
import { NavArrows } from "@/components/ui/nav-arrows";

export async function generateMetadata({
  params,
}: PageProps<"/i/[token]">): Promise<Metadata> {
  const { token } = await params;
  const invite = await loadInvite(token);

  if (!invite) {
    return { title: "Invitation not found" };
  }

  const dict = getDictionary(invite.language);
  return {
    title: dict.invitedTo(invite.eventName),
    description: dict.greeting(invite.fullName),
  };
}

export default async function InvitePage({
  params,
}: PageProps<"/i/[token]">) {
  const { token } = await params;
  const invite = await loadInvite(token);

  if (!invite) {
    notFound();
  }

  const dict = getDictionary(invite.language);
  const clientDict = toClientDictionary(dict);
  const theme = parseThemeConfig(invite.themeConfig);
  const siteUrl = await getSiteUrl();
  const qrSvg = await generateQrSvg(`${siteUrl}/i/${token}`);
  const mapsHref = getMapsUrl(invite);
  const mapEmbedSrc = getMapEmbedUrl(invite);
  const googleCalHref = getGoogleCalendarUrl(invite);

  return (
    <main
      style={themeCssVars(theme)}
      className="min-h-screen bg-[var(--zuka-bg)] text-[var(--zuka-fg)]"
    >
      <div className="mx-auto flex max-w-md flex-col gap-6 px-5 py-10">
        <NavArrows buttonClassName="text-[var(--zuka-fg)] opacity-60 hover:opacity-100" />

        <header>
          <p className="text-sm opacity-70">{dict.greeting(invite.fullName)}</p>
          <h1 className="mt-1 text-2xl font-semibold leading-snug">
            {dict.invitedTo(invite.eventName)}
          </h1>
        </header>

        <Countdown startsAt={invite.startsAt} dict={clientDict} />

        <section className="rounded-xl bg-[var(--zuka-card)] p-5 text-[var(--zuka-card-fg)] shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">
            {dict.eventDetails}
          </h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="opacity-60">{dict.when}</dt>
              <dd className="font-medium">{formatTanzaniaDateTime(invite.startsAt)}</dd>
            </div>

            {(invite.venueName || invite.venueAddress) && (
              <div>
                <dt className="opacity-60">{dict.where}</dt>
                <dd className="font-medium">
                  {[invite.venueName, invite.venueAddress].filter(Boolean).join(" · ")}
                </dd>
                {mapsHref && (
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-sm font-medium underline text-[var(--zuka-accent)]"
                  >
                    {dict.getDirections}
                  </a>
                )}
                {mapEmbedSrc && (
                  <iframe
                    src={mapEmbedSrc}
                    title={dict.where}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="mt-3 h-48 w-full rounded-lg border-0"
                  />
                )}
              </div>
            )}

            {invite.tableLabel && (
              <div>
                <dt className="opacity-60">{dict.table}</dt>
                <dd className="font-medium">{invite.tableLabel}</dd>
              </div>
            )}
          </dl>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <a
              href={googleCalHref}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {dict.googleCalendar}
            </a>
            <a href={`/i/${token}/calendar.ics`} className="underline">
              {dict.appleOutlookCalendar}
            </a>
          </div>
        </section>

        <section className="rounded-xl bg-[var(--zuka-card)] p-5 text-[var(--zuka-card-fg)] shadow-sm">
          <RsvpButtons token={token} initialStatus={invite.rsvpStatus} dict={clientDict} />
        </section>

        <section className="flex flex-col items-center rounded-xl bg-[var(--zuka-card)] p-5 text-center text-[var(--zuka-card-fg)] shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">
            {dict.entryPass}
          </h2>
          <div
            className="mt-3 w-48 rounded-lg bg-white p-3"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <p className="mt-2 text-xs opacity-70">{dict.entryPassHint}</p>
          {invite.seatsAllotted > 1 && (
            <p className="mt-1 text-xs opacity-70">
              {dict.seats}: {invite.seatsAllotted}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
