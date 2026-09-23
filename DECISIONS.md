# DECISIONS.md

Running record of every `>>> DECISION` checkpoint for ZukaEvents. Append-only — new decisions get added at the bottom, never edited in place. If a decision is later reversed, add a new entry, don't rewrite history.

---

## 2026-09-19 — 5.1 Background job runner

**Question:** What runs invite sends, retries, the WhatsApp→SMS fallback timer, and Sheets batching, given Vercel functions are short-lived?

**Choice:** Inngest.

**Reasoning:** Managed retries, dead-letter visibility, and native delayed/scheduled steps (needed for the WhatsApp→SMS fallback timer) with a strong Vercel/Next.js integration story. Avoids hand-rolling a queue, which the brief explicitly rules out.

---

## 2026-09-19 — 5.2 WhatsApp path

**Question:** Which messaging integration for v1 — Meta Cloud API, Twilio, a BSP, or SMS-first?

**Choice:** SMS-first via NextSMS. WhatsApp deferred to a later, isolated addition.

**Reasoning:** All the rich content (name, table, map, countdown, QR) lives on the `/i/[token]` web page, so the message only needs to deliver a link reliably. Avoids Meta business verification and template approval risk, which has already blocked this project once. The delivery layer is built channel-agnostic (a `DeliveryProvider` interface) so WhatsApp can be added later without touching the queue, webhook handling, or `delivery_events` schema.

---

## 2026-09-19 — 5.3 Google Sheets connection model

**Question:** One-way push with a shared service account, two-way sync, or per-organiser OAuth?

**Choice:** One-way push, single service account.

**Reasoning:** Simplest auth setup (no OAuth flow, no per-organiser onboarding), and it's the only option that can't turn Sheets into a partial source of truth — matching the brief's "direction of data matters" rule directly.

---

## 2026-09-19 — 5.4 QR strategy

**Question:** Static signed token, short-lived rotating code, or static-by-default-with-rotating-opt-in?

**Choice:** Static signed token, no rotation option in v1.

**Reasoning:** Rotating codes require the guest to have a live connection at the door to show a fresh code, which conflicts directly with the brief's #1 non-negotiable (offline check-in) and the stated unreliability of guest connectivity in Tanzanian venues. The "forwarded screenshot" risk is already mitigated by the product's own duplicate-detection design (second scan fails and is logged/flagged to staff), so static tokens carry no unaddressed downside.

---

## 2026-09-19 — 5.5 Mobile money / contributions

**Question:** Build contribution collection in v1, and if so, via which aggregator?

**Choice:** No, not in v1.

**Reasoning:** Out of scope for the initial build. A `contributions` extension point will be kept in mind conceptually (e.g., room for a future table keyed to `event_id`/`guest_id`) but nothing will be built — no schema, no UI, no provider integration — until explicitly requested.

---

## 2026-09-19 — 5.6 Card designer scope

**Question:** Ship 3–5 fixed themes, or build the full drag-and-drop designer with ZIP export in v1?

**Choice:** 3–5 fixed, well-made themes. No designer in v1.

**Reasoning:** The designer is the least load-bearing part of the product for the core "guest gets in the door" outcome. Fixed themes ship faster and avoid building a rendering engine that has to match the editor preview, the live invite page, and the OG image exactly.

---

## 2026-09-19 — 5.7 Auth model for door staff

**Question:** Per-event PIN/join code, magic links, or named sub-accounts for scanner access?

**Choice:** Per-event scanner PIN/join code.

**Reasoning:** Gate staff are often hired for the night on a shared device. A PIN/join code gets a device scanning within seconds with no pre-provisioning, matching that reality better than magic links (needs contact info on file ahead of time, adds a delivery channel that can fail) or named sub-accounts (requires advance provisioning per staffer). `gate_label` is captured at code entry and `device_id` automatically, supporting the multi-gate duplicate/conflict logic required in Phase 5.

---

## 2026-09-23 — 5.1 revised: Background job runner (Inngest → Supabase pg_cron + pg_net)

**Question:** Phase 4 was built on Inngest per the original 5.1 answer. Reopened: no third-party job-queue vendor at all.

**Choice:** Supabase `pg_cron` + `pg_net`, with the actual NextSMS HTTP call made directly from Postgres (not a Supabase Edge Function).

**Reasoning:** Removes Inngest as a dependency and account entirely. `pg_net` is asynchronous — a SQL function fires the request and gets a request ID back immediately; the response arrives later in `net._http_response`, polled by a second scheduled function — so this needed two cron-scheduled functions (`dispatch_send_jobs`, `collect_send_responses`) instead of one, plus a `send_jobs` table to track request lifecycle between them. Chose direct `pg_net` calls over a Supabase Edge Function specifically to avoid introducing the Supabase CLI (`supabase functions deploy`) as a new tool in this project — everything ships as another SQL migration, the same paste-into-the-SQL-Editor workflow already in use throughout.

**Trade-off accepted:** the NextSMS integration logic now lives in SQL/plpgsql instead of TypeScript, which is harder to unit test (the previous `lib/delivery/nextsms.ts` and its 6 unit tests were deleted — no TS code makes the HTTP call anymore) and less naturally reusable for a future WhatsApp provider than the channel-agnostic `DeliveryProvider` interface from decision 5.2 would have been. Message text and the invite URL are still built in TypeScript (`lib/i18n.ts`, tested) and stored on the `send_jobs` row at queue time, so the SQL side stays purely mechanical (read a row, fire the request) rather than needing i18n or `NEXT_PUBLIC_SITE_URL` inside Postgres.
