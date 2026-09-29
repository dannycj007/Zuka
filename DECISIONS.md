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

---

## 2026-09-23 — 5.1 revised again: Supabase pg_cron + pg_net → direct synchronous TypeScript send

**Question:** Live debugging of the pg_net-based pipeline (see the revision above) surfaced real friction with the approach itself, independent of the NextSMS API-discovery issues also hit along the way (wrong auth scheme, wrong sender ID — see the "Fix sender ID" and "Fix NextSMS auth" commits, both of which would have needed the same debugging under any implementation). Specifically: `pg_net` is asynchronous, requiring a two-step dispatch/collect split plus a `send_jobs` queue table instead of one direct call; the send logic lived in SQL/plpgsql, which is harder to debug live and has no unit test story; and `pg_net`'s own documentation is thin (had to source basic function signatures via web search rather than a proper reference).

**Choice:** Drop the queue and pg_net/pg_cron entirely. The organiser's "Send"/"Resend" click now calls NextSMS directly and synchronously from the Next.js server action, in TypeScript, the same shape as the original Inngest-era `lib/delivery/nextsms.ts` — restored, this time with the auth format and sender name corrected from live testing (Bearer token, not Basic; `ZUKA EVENTS`, not `ZUKA`).

**Reasoning:** The scaling concern that motivated moving off a direct call in the first place — a bulk "Send to all pending" risking Vercel's function timeout on a large guest list — is real but is a Phase 7 (500-guest load test) problem, not a Phase 4 one. Optimizing for it now, before a single real SMS had successfully sent, was solving the wrong problem first. `supabase/migrations/0005_drop_send_jobs_pg_cron.sql` tears down everything `0004` added (the `send_jobs` table, both scheduled functions, both cron schedules), keeping `pg_net`/`pg_cron` themselves enabled but unused rather than risking dropping extensions something else might depend on.

**Trade-off accepted (again, in the other direction from the previous revision):** back to no automatic retry on transient failures — a failed send (any reason) is logged once and left for the organiser to retry manually via the existing "Retry" button, rather than the automatic-retry-up-to-3-times behavior the pg_net version had. Simpler code, and matches what the brief's Phase 4 "done when" criterion actually requires (see a failure with a usable reason — not automatic retry).

---

## 2026-09-24 — UI redesign around the brand logo

**Question:** The organiser-facing app (auth, dashboard, event/guest management, delivery status) had shipped with zero visual identity — plain black-on-white Tailwind defaults from the Next.js starter, no brand colors, no shared components. The user supplied a finished ZukaEvents logo (orange-to-purple gradient "Z" on near-black, African geometric pattern accents, "Invite · Connect · Celebrate.") and asked for the UI to be redesigned around it, deferring the SMS/WhatsApp delivery debugging for later.

**Choice:** Dark theme (`#0b0a10` background, `#15131c` surface) with the logo's orange (`#f5811f`) → purple (`#8b2fe8`) gradient as the signature accent (primary buttons, active nav underline, headings via `.text-brand-gradient`), a faint two-tone diagonal-line pattern behind the whole app echoing the motif behind the logo's Z, and Poppins (display/headings) + Inter (body) via `next/font/google`. Built a small shared component set (`components/ui/`: `Button`, `Card`, `Badge`, `PageHeader`, `StatTile`, `Logo`) plus reusable form classes (`field-input`, `field-label`, etc. in `globals.css`) so every page draws from the same system instead of repeating Tailwind utility strings. Scope is the organiser app only — the 5 guest-facing invite themes (decision 5.6) already have their own decided brand identity per event and are untouched.

**Reasoning:** A from-scratch component layer (rather than restyling each page's inline Tailwind classes independently) keeps the ~20 touched files visually consistent and makes the next new page cheap to build correctly. Tokens live in CSS custom properties (`--brand-orange`, `--surface`, etc.) rather than hardcoded hex in components, so the palette can be adjusted in one place if the brand evolves.

**Verification note:** typecheck, lint, the full unit test suite, and a production build all pass. Visually confirmed via a headless-browser screenshot of the login and signup pages (the only organiser pages that render without a live Supabase session) — the dashboard, event, and guest pages use the same shared components and passed typecheck/build, but weren't screenshotted live since this sandbox can't reach a real Supabase project. Worth a quick look once deployed.

---

## 2026-09-29 — 5.2 fulfilled: WhatsApp via Meta Cloud API directly

**Question:** Decision 5.2 (2026-09-19) deferred WhatsApp to "a later, isolated addition," built channel-agnostic from the start specifically so this wouldn't require touching the send action or `delivery_events` schema. The user has a Meta Business Manager account (not yet verified) and asked to build on Meta's Cloud API directly, rather than a BSP like Twilio — confirmed via an explicit choice, not assumed, since the original 5.2 reasoning had specifically flagged "Meta business verification and template approval risk" as the reason SMS shipped first.

**Choice:** `WhatsAppProvider` (`lib/delivery/whatsapp.ts`) implements the existing `DeliveryProvider` interface, called directly and synchronously from `delivery-actions.ts` — same shape as NextSMS, no queue. `SendMessageInput` (`lib/delivery/provider.ts`) gained two optional fields, `templateParams` and `language`, since WhatsApp can't send free text to a guest who hasn't messaged first (Meta's 24-hour customer-service-window policy) — every send must be a pre-approved template with ordered `{{1}}`, `{{2}}`, ... substitutions, not a single text blob like SMS. The guest list and delivery status pages show separate SMS/WhatsApp buttons per guest rather than one unified "Send," since `latest_delivery_status` is one denormalized column per guest (see `sync_guest_delivery_status()` in `0001_init.sql`) with no per-channel tracking — the app has no reliable way to know "was WhatsApp specifically ever tried for this guest" to justify a "Resend" label. Also built `app/api/webhooks/whatsapp/route.ts`'s GET handshake for real (unlike NextSMS's still-501 webhook stub) since Meta's verification protocol is standard and well-documented, confirmed via multiple independent sources rather than guessed.

**Reasoning:** Every technical detail here (endpoint shape, auth header, template payload structure, response/error shapes, and critically the language code) was verified via web search before writing any code — developers.facebook.com itself is unreachable from this sandbox, so each claim was cross-checked against 2+ independent sources (other BSPs' docs, Meta doc mirrors) rather than trusted from a single page, learning directly from the NextSMS auth-scheme mistake earlier in this project (a single blog post's wrong `Basic` vs `Bearer` claim cost a full debugging session). That process caught a real, non-obvious bug before it shipped: WhatsApp's language code for Swahili is `swa`, not `sw` — this app's own internal convention (`Lang = "en" | "sw"`) would have been silently wrong here, failing as "template not found" rather than an obvious auth error. `WhatsAppProvider` maps this explicitly rather than assuming the two code systems match.

**Trade-off accepted:** no automatic WhatsApp→SMS fallback, despite that being part of the original Inngest-era plan (a "WhatsApp→SMS fallback timer" is mentioned in decision 5.1's first entry). Building that needs to know whether a WhatsApp send actually landed, which needs the webhook's POST handler fully processing `entry[].changes[].value.statuses[]` into `delivery_events` — left as a stub returning 200 (so Meta doesn't disable the subscription) but not yet parsed, same "stub honestly rather than fake it" posture as the NextSMS webhook. The organiser gets two explicit buttons instead. Also not built: bulk WhatsApp send (`sendAllPending` stays SMS-only) — WhatsApp conversations cost money per-recipient once Business Verification completes, so a bulk action needs its own confirmation UX before it should exist, not reuse SMS's.

**Live status:** code is written and unit tested (`lib/delivery/whatsapp.test.ts`, 8 tests, all passing) but **unverified against the real API** — the user's Business Manager account exists but hasn't completed Business Verification, which limits sending to 5 manually-added test recipients until it does. No message template has been created/submitted yet either. See README's "WhatsApp (Meta Cloud API)" section for the exact template text to submit and a flagged compliance question this project can't answer on the user's behalf: whether Meta will categorize an unsolicited event invite as `UTILITY` or `MARKETING`, which affects cost and opt-in requirements.
