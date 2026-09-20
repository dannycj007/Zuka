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
- NextSMS for SMS (sender ID `ZUKA`)
- Inngest for background jobs/retries
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
| NextSMS account, API key, sender ID `ZUKA` | nextsms.co.tz — Settings → API. Sender ID approval can take time; the delivery layer handles a not-yet-approved sender gracefully | **Yes**, for Phase 4 |
| NextSMS delivery-report/webhook docs | Same dashboard, or your account rep — whatever page/PDF describes delivery callbacks | **Not blocking Phase 4**, but the webhook receiver (`app/api/webhooks/nextsms/route.ts`) stays a stub returning 501 until this exists — see "NextSMS webhooks" below |
| Inngest project keys | app.inngest.com → create an app, Settings → Keys | **Yes**, for Phase 4 in production (local dev can run without these — see below) |
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

Sending an invite: a "Send"/"Resend" button per guest, or "Send to all
pending" on the guest list, both insert a `queued` row into
`delivery_events` immediately, then hand off to Inngest
(`lib/inngest/functions.ts`). The background job sends via NextSMS
(`lib/delivery/nextsms.ts`), logs a `sent` or `failed` row, and only lets
Inngest auto-retry on transient failures (network errors, NextSMS 5xx) —
a permanent failure (bad number, unapproved sender, any 4xx) is logged
once and left for the organiser to retry manually from the "Delivery
status" page, not retried silently.

**NextSMS webhooks aren't implemented.** The confirmed parts of their API
(endpoint, auth header, request body — see the comment in
`lib/delivery/nextsms.ts`) came from their own public "integrate in 5
minutes" blog post, found via search since `nextsms.co.tz` itself is
blocked by this sandbox's network policy. Nothing available documents
their delivery-report/webhook payload shape or signature scheme, and the
brief requires verified, idempotent webhook handling — faking that
verification would be worse than not having the endpoint at all,
so `app/api/webhooks/nextsms/route.ts` returns 501 until real docs are
available. Without it, delivery status stops at "sent" — no `delivered`
or `read` transitions.

**Local dev without real Inngest keys**: run `npx inngest-cli@latest dev`
alongside `npm run dev` — it runs Inngest's dev server locally and
auto-discovers functions served from `/api/inngest`, no `INNGEST_EVENT_KEY`
or `INNGEST_SIGNING_KEY` needed until you deploy to production.
