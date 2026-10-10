# ZukaEvents

Digital event invitations and offline-first guest check-in for the Tanzanian
market. Full product brief and phase plan live in the project's founding
conversation; every `>>> DECISION` checkpoint answered so far is recorded in
[`DECISIONS.md`](./DECISIONS.md) — treat that file as project memory.

**Status:** Phases 1-3 complete. Phase 4 (Delivery and tracking) in progress.

## Stack

- Next.js (App Router) + TypeScript, deployed on Vercel
- Supabase — Postgres, Auth, Storage, Realtime, Row Level Security
- Tailwind for styling
- HudumaSMS for SMS (sender ID `ZUKAEVENTS`; replaced NextSMS on
  2026-10-10 — see decision 5.1's entry in `DECISIONS.md`), called
  directly and synchronously from the Next.js server action — no job
  queue, no third-party job-queue vendor (see "Delivery (Phase 4)" below)
- WhatsApp via Meta's Cloud API directly (no BSP) — decision 5.2's
  2026-09-29 addition, same synchronous-send shape as HudumaSMS (see
  "WhatsApp (Meta Cloud API)" below)
- Google Sheets (one-way mirror, service account) — Phase 6
- Sentry for error tracking — Phase 7

## Local setup

```bash
npm install
cp .env.example .env   # fill in the values below
```

Then, once you have a Supabase project (see below), apply the migrations in
`supabase/migrations/` in order via the Supabase CLI or SQL editor, sign up
in the running app, and run the seed script:

```bash
npm run dev
# sign up at http://localhost:3000/signup, create your organisation
npm run seed:demo -- you@example.com
```

## Connections checklist

For each phase, only get the credentials that phase actually needs — don't
front-load all of them. What's marked "needed now" below is for Phase 1.

| Credential | Where to get it | Needed now? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → your project → Project Settings → API | **Yes** |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page, "service_role" secret — server-only, never expose client-side | **Yes** |
| `SUPABASE_DB_URL` | Project Settings → Database → Connection string | **Yes**, to apply migrations |
| Vercel project + env vars per environment | vercel.com → New Project, import this repo | Not yet — local dev is enough for Phase 1 |
| HudumaSMS account, API key, sender ID `ZUKAEVENTS` | huduma.cloud dashboard → Developer → API Keys tab. Sender was `Active` immediately, no approval wait. The key goes into `HUDUMASMS_API_KEY` in `.env`/Vercel, same as any other credential — see "Delivery (Phase 4)" below | **Yes**, for Phase 4 |
| Meta system-user access token, WhatsApp Phone Number ID, approved message template | business.facebook.com → your Business Manager. See "WhatsApp (Meta Cloud API)" below for the exact steps and template text | Optional — only if you want WhatsApp sending, added 2026-09-29 |
| Google Cloud service account JSON + Sheets API enabled | console.cloud.google.com — share your sheet with the service account's email as Editor | Phase 6 |
| Sentry DSN | sentry.io → new project | Phase 7 |
| Mobile money credentials | Not applicable — deferred out of v1 (decision 5.5) | — |

I will never invent any of the above. If a value is missing when a phase
needs it, I'll stop and tell you exactly what to get and where.

## Database

Schema and RLS policies live in `supabase/migrations/`, applied in order:

- `0001_init.sql` — all Phase 1 tables (see `DECISIONS.md` and the Phase 1
  proposal for the two deviations from the original brief's table list:
  `check_ins.event_id`, and the new `scanner_codes`/`scanner_sessions`
  tables implementing decision 5.7).
- `0002_rls.sql` — Row Level Security for every table, scoped to the
  authenticated organiser's own organisation.
- `0003_public_invite_access.sql` — seeds the 5 fixed themes (decision
  5.6), and adds `get_invite(token)` / `submit_rsvp(token, status)`, the
  two `SECURITY DEFINER` functions the public `/i/[token]` guest invite
  page uses instead of a direct (and much more exposed) anon `SELECT`
  policy on `guests`. **Apply this before re-running either seed
  script** — both now look up a real theme by name rather than creating
  a placeholder.
- `0004_send_jobs_pg_cron.sql` / `0005_drop_send_jobs_pg_cron.sql` — an
  abandoned delivery architecture (`send_jobs` queue + `pg_cron`/`pg_net`)
  and its teardown; see "Delivery (Phase 4)" below. Skip `0004` entirely
  on a fresh project — go straight from `0003` to `0006`. Only apply
  `0005` if `0004` was applied previously.
- `0006_hudumasms_provider.sql` — adds `'hudumasms'` to
  `delivery_events.provider`'s allowed values (decision 5.1's 2026-10-10
  provider swap). Every project needs this one, fresh or not — sending
  itself needs no migration beyond it, just `HUDUMASMS_API_KEY`.

`lib/types/database.ts` is a **hand-written** TypeScript type matching
these migrations, used to type the Supabase clients until a real project
exists to introspect. Once you have a Supabase project running these
migrations, regenerate it for real with:

```bash
supabase gen types typescript --db-url "$SUPABASE_DB_URL" > lib/types/database.ts
```

and replace this hand-written version — don't hand-maintain both.

## Seed script

`scripts/seed-demo.mjs` creates (or reuses) an organisation for a given
signed-up user, one demo wedding event using the "Garden" theme, and 20
guests with realistic Tanzanian names and `+255` phone numbers. It's plain
JS on purpose — no TypeScript runner needed to seed some rows.

```bash
npm run seed:demo -- you@example.com
```

If you don't have a way to run Node against your Supabase project (no
outbound network access from wherever you're working, no local clone), use
`supabase/seed/demo-seed.sql` instead: edit the email at the top, then paste
and run the whole file in the Supabase SQL Editor. It does the same thing,
just as plain SQL — safe to rerun, and it adds a new event each time rather
than deduplicating.

## Delivery (Phase 4)

**Live status as of 2026-10-10**: working. The first real SMS in this
project's history sent successfully on day one of switching to
HudumaSMS — `ZUKAEVENTS` was `Active` as a sender immediately, no
approval wait. (NextSMS, the original provider, is gone — see decision
5.1's 2026-10-10 entry in `DECISIONS.md` for why.)

No job queue and no third-party job-queue vendor (see decision 5.1's two
2026-09-23 revisions in `DECISIONS.md` — first Inngest was dropped for
Supabase `pg_cron`/`pg_net`, then that was dropped too, after live
debugging showed real friction with `pg_net`'s async two-step
dispatch/collect split and its SQL/plpgsql business logic having no unit
test story). Sending is a single direct, synchronous call:

1. A "Send"/"Resend" button per guest, or "Send to all pending" on the
   guest list, builds the guest's personalized message and invite link in
   TypeScript (`lib/i18n.ts`'s `getInviteSmsText`), then calls
   `HudumaSmsProvider.send()` (`lib/delivery/hudumasms.ts`) directly from
   the server action (`delivery-actions.ts`) and waits for the result.
2. Whatever HudumaSMS returns — success or failure — is logged
   immediately as one `delivery_events` row (`sent` or `failed`, with the
   provider's message ID or error code/message). `delivery_events` is the
   only source of truth; there's no separate queue table.
3. A failed send (any reason — bad number, insufficient credit, network
   error, HudumaSMS 5xx) is logged once and left for the organiser to
   retry manually via the "Retry" button on the delivery status page. No
   automatic retry.

**Setup**: put your real HudumaSMS API key into `HUDUMASMS_API_KEY` in
`.env` (local) or your Vercel project's environment variables (deployed)
— same as any other credential in this project, never committed to git.
Set `HUDUMASMS_SENDER_NAME` only to override the default `ZUKAEVENTS`.

If you previously applied `0004_send_jobs_pg_cron.sql` (an earlier,
now-abandoned architecture), apply
`supabase/migrations/0005_drop_send_jobs_pg_cron.sql` to tear down the
`send_jobs` table, its two scheduled functions, and their `pg_cron`
schedules first. Every project (fresh or not) needs
`0006_hudumasms_provider.sql`, which adds `'hudumasms'` to
`delivery_events.provider`'s allowed values — it keeps `'nextsms'` in
that list too, purely so historical rows from before this switch stay
valid, even though the app never writes that value again.

**Auth**: HudumaSMS uses an `X-API-Key: <key>` header (get it from their
dashboard's Developer → API Keys tab). Every detail of their API —
endpoint, auth header, request/response shapes — was confirmed directly
from two live curl tests against the real account on 2026-10-10 (one
success, one deliberate 401), not inferred from docs or a blog post. See
the doc comment in `lib/delivery/hudumasms.ts` for the exact confirmed
JSON shapes.

**HudumaSMS webhooks aren't implemented**, and may not need to be:
their API exposes `GET /sms/:messageId` for polling a message's delivery
status instead of push webhooks — this app doesn't call it yet (delivery
status stops at `sent`, no `delivered`/`read` transitions), but that's a
smaller addition than building webhook signature verification from
scratch, whenever that's wanted.

**Trade-off worth knowing:** a bulk "Send to all pending" on a large
guest list sends one at a time, synchronously, inside a single server
action — real for a Phase 7 (500-guest) load test against Vercel's
function timeout, but not a concern at the guest-list sizes Phase 4
exercises. Revisit if/when that phase's load test shows it's actually a
problem (see DECISIONS.md's "5.1 revised again" entry).

## WhatsApp (Meta Cloud API)

Decision 5.2 deferred WhatsApp to "a later, isolated addition" — this is
that addition, added 2026-09-29. Same shape as HudumaSMS: `WhatsAppProvider`
(`lib/delivery/whatsapp.ts`) implements the same `DeliveryProvider`
interface and is called directly and synchronously from the same
`delivery-actions.ts`, no queue. The guest list and delivery status pages
now show separate SMS and WhatsApp buttons per guest — see the trade-off
note below on why they're not labeled Send/Resend per channel.

**Why a template message, not free text:** WhatsApp only allows free-form
text replies within a 24-hour window after the *user* messages the
business first. An organiser sending an invite is always
business-initiated, so it must go through a pre-approved message
**template** — there's no way around this, it's a Meta policy, not a
technical limitation this app could route around.

### One-time setup in Meta Business Manager

1. **System user + access token**: Business Settings → System users →
   Add. Assign it your WhatsApp Business Account with the
   `whatsapp_business_messaging` permission, then generate a token —
   pick the permanent (non-expiring) option, not the 23-hour test token.
   Copy it immediately; Meta only shows it once. → `WHATSAPP_ACCESS_TOKEN`.
2. **Phone Number ID**: your app's dashboard → WhatsApp → API Setup —
   the numeric Phone Number ID shown there, not the phone number itself.
   → `WHATSAPP_PHONE_NUMBER_ID`.
3. **Message template**: WhatsApp Manager → Message Templates → Create.
   Submit this body text (matches the existing SMS copy in
   `lib/i18n.ts`'s `getInviteSmsText`, so both channels read the same to
   a guest who somehow gets both) with 3 variables:

   English (`en_US`):
   > Hi {{1}}! You're invited to {{2}}. View your invite: {{3}}

   Swahili (`swa` — WhatsApp's own code for Swahili, **not** `sw`;
   confirmed against Meta's supported-languages list since it's a real
   gotcha that fails silently as "template not found" rather than an
   auth error): submit the same template name with this body as a
   second language/translation:
   > Habari {{1}}! Umealikwa kwenye {{2}}. Tazama mwaliko wako: {{3}}

   Use the same template `name` for both languages — this app requests
   whichever language code matches the event's language at send time.
   **Category matters and I won't guess it for you**: Meta's review
   decides whether this counts as `UTILITY` or `MARKETING`. An
   unsolicited event invite to someone who hasn't explicitly opted in to
   WhatsApp messages from you is a genuine gray area under Meta's
   Business Messaging Policy, not just a technicality — if Meta comes
   back with `MARKETING`, that template carries per-conversation cost
   and stricter opt-in expectations. Worth reading Meta's policy on
   this yourself before submitting, since it's a compliance call for
   your business, not something I can make for you.
   → `WHATSAPP_TEMPLATE_NAME` (the template's `name`, not its display title).
4. **Webhook** (Meta's "Configure Webhooks" dashboard step): Callback
   URL is `https://<your-deployed-domain>/api/webhooks/whatsapp`
   (`app/api/webhooks/whatsapp/route.ts` handles the verification
   handshake for real). Verify token is a secret you invent — put the
   same string in that field and in `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
   Not needed for local dev/testing, only for the dashboard to let you
   move past that step.
5. **Add payment / Business Verification**: pure Meta Business Manager
   steps with nothing in this codebase — follow their dashboard.

### Live status as of 2026-09-29

Code is written and unit tested (`lib/delivery/whatsapp.test.ts`), but
**no real message has been sent yet** — your Business Manager account
exists but Business Verification hasn't completed. Until it does, Meta
only allows sending to up to 5 phone numbers you've manually added as
test recipients in the App Dashboard, not your real guest list. Every
send attempt outside that constraint fails cleanly and gets logged to
`delivery_events` with Meta's real error message, same graceful-failure
pattern as NextSMS's pre-approval period.

**Trade-off worth knowing:** no automatic WhatsApp→SMS fallback (the
original brief's Inngest-era plan had one). Building that needs the
webhook's POST handler fully wired to know whether a WhatsApp send
actually landed before falling back — right now POST only returns 200
so Meta doesn't disable the subscription, it doesn't process delivery
status into `delivery_events` yet (see the comment in
`app/api/webhooks/whatsapp/route.ts` for exactly what's left). Until
then, the guest list gives the organiser two explicit buttons (SMS,
WhatsApp) instead of guessing which channel to try.

**Also worth knowing:** `latest_delivery_status` is one denormalized
column per guest (whichever channel was attempted most recently wins),
not tracked separately per channel — see `sync_guest_delivery_status()`
in `0001_init.sql`. That's why the guest list's buttons are labeled
plainly "SMS" / "WhatsApp" rather than "Send"/"Resend": this app can't
tell from that column alone whether WhatsApp specifically was ever
tried for a guest whose last SMS succeeded.
