# ZukaEvents

Digital event invitations and offline-first guest check-in for the Tanzanian
market. Full product brief and phase plan live in the project's founding
conversation; every `>>> DECISION` checkpoint answered so far is recorded in
[`DECISIONS.md`](./DECISIONS.md) — treat that file as project memory.

**Status:** Phase 1 (Foundation) in progress.

## Stack

- Next.js (App Router) + TypeScript, deployed on Vercel
- Supabase — Postgres, Auth, Storage, Realtime, Row Level Security
- Tailwind for styling
- NextSMS for SMS (sender ID `ZUKA`) — Phase 4
- Inngest for background jobs/retries/scheduled sends — Phase 4
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
| NextSMS account, API key, sender ID `ZUKA` | nextsms.co.tz — sender ID approval can take time; note if it's still pending when we reach Phase 4 | Phase 4 |
| Inngest project keys | app.inngest.com | Phase 4 |
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
signed-up user, one placeholder "Classic" theme, one demo wedding event, and
20 guests with realistic Tanzanian names and `+255` phone numbers. It's
plain JS on purpose — no TypeScript runner needed to seed some rows.

```bash
npm run seed:demo -- you@example.com
```
