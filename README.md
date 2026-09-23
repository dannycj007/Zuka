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
- NextSMS for SMS (sender ID `ZUKA EVENTS` — the brief originally said
  `ZUKA`, but that's not what's actually registered in the NextSMS
  account; corrected 2026-09-23 after live testing), called directly and
  synchronously from the Next.js server action — no job queue, no
  third-party job-queue vendor (see "Delivery (Phase 4)" below and
  decision 5.1's two 2026-09-23 revisions in `DECISIONS.md`)
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
| NextSMS account, API key, sender ID `ZUKA EVENTS` | nextsms.co.tz dashboard → Customer Info → Customization → API Keys. As of 2026-09-23 this sender is registered but not yet approved (`Sender Names` tab shows `Status: No`) — the delivery layer handles that gracefully. The key goes into `NEXTSMS_API_KEY` in `.env`/Vercel, same as any other credential — see "Delivery (Phase 4)" below | **Yes**, for Phase 4 |
| NextSMS delivery-report/webhook docs | Same dashboard, or your account rep — whatever page/PDF describes delivery callbacks | **Not blocking Phase 4**, but the webhook receiver (`app/api/webhooks/nextsms/route.ts`) stays a stub returning 501 until this exists — see "NextSMS webhooks" below |
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
  on a fresh project — go straight from `0003` to whatever the current
  delivery code needs, which as of this architecture is nothing further
  (sending needs no migration, just `NEXTSMS_API_KEY`). Only apply `0005`
  if `0004` was applied previously.

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

**Live status as of 2026-09-23**: sending is implemented and unit tested,
but no real SMS has been confirmed delivered yet — blocked on NextSMS
approving the `ZUKA EVENTS` sender ID (their `Sender Names` dashboard tab
shows `Status: No`, `Processed: No`). This is exactly the scenario the
brief anticipated — every attempt against an unapproved sender fails
cleanly with `403 Not Authorized`, logged with that reason and visible on
the delivery status page, nothing crashes. Testing against an
already-approved sender (e.g. `MICHANGO`, via `NEXTSMS_SENDER_ID`) is the
way to confirm the pipeline works end-to-end before `ZUKA EVENTS` is
approved.

No job queue and no third-party job-queue vendor (see decision 5.1's two
2026-09-23 revisions in `DECISIONS.md` — first Inngest was dropped for
Supabase `pg_cron`/`pg_net`, then that was dropped too, after live
debugging showed real friction with `pg_net`'s async two-step
dispatch/collect split and its SQL/plpgsql business logic having no unit
test story). Sending is now a single direct, synchronous call:

1. A "Send"/"Resend" button per guest, or "Send to all pending" on the
   guest list, builds the guest's personalized message and invite link in
   TypeScript (`lib/i18n.ts`'s `getInviteSmsText`), then calls
   `NextSmsProvider.send()` (`lib/delivery/nextsms.ts`) directly from the
   server action (`delivery-actions.ts`) and waits for the result.
2. Whatever NextSMS returns — success or failure — is logged immediately
   as one `delivery_events` row (`sent` or `failed`, with the provider's
   message ID or error code/message). `delivery_events` is the only
   source of truth; there's no separate queue table.
3. A failed send (any reason — bad number, unapproved sender, network
   error, NextSMS 5xx) is logged once and left for the organiser to retry
   manually via the "Retry" button on the delivery status page. No
   automatic retry.

**Setup**: put your real NextSMS API key into `NEXTSMS_API_KEY` in `.env`
(local) or your Vercel project's environment variables (deployed) — same
as any other credential in this project, never committed to git. Set
`NEXTSMS_SENDER_ID` only to override the default `ZUKA EVENTS` (e.g. for
testing against an already-approved sender).

If you previously applied `0004_send_jobs_pg_cron.sql` (an earlier
architecture, now abandoned), apply
`supabase/migrations/0005_drop_send_jobs_pg_cron.sql` to tear down the
`send_jobs` table, its two scheduled functions, and their `pg_cron`
schedules. It leaves the `pg_net`/`pg_cron` extensions themselves enabled
(unused, harmless) and leaves the `nextsms_api_key` Vault secret in place
(also unused, harmless) rather than risk affecting anything else that
might depend on them. A fresh project that never ran `0004` doesn't need
`0005` either, but it's safe to run regardless (every statement is
`if exists`/`if not exists`).

**Auth**: NextSMS uses Bearer token auth (`Authorization: Bearer <token>`,
token from their dashboard under Customer Info → Customization → API
Keys) — confirmed from their real API docs after their public "integrate
in 5 minutes" blog post's `Authorization: Basic <key>` example turned out
to be wrong (their actual Basic auth option needs base64-encoded
`username:password`, not a bare key, per standard HTTP Basic auth).

**NextSMS webhooks aren't implemented.** Nothing available documents
their delivery-report/webhook payload shape or signature scheme
(`nextsms.co.tz` itself is blocked by this sandbox's network policy, and
this wasn't in the API docs pages found so far), and the brief requires
verified, idempotent webhook handling — faking that verification would be
worse than not having the endpoint at all, so
`app/api/webhooks/nextsms/route.ts` returns 501 until real docs are
available. Without it, delivery status stops at `sent` — no `delivered`
or `read` transitions.

**Trade-off worth knowing:** a bulk "Send to all pending" on a large
guest list sends one at a time, synchronously, inside a single server
action — real for a Phase 7 (500-guest) load test against Vercel's
function timeout, but not a concern at the guest-list sizes Phase 4
exercises. Revisit if/when that phase's load test shows it's actually a
problem (see DECISIONS.md's "5.1 revised again" entry).
