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

---

## 2026-10-10 — 5.1 provider swap: NextSMS → HudumaSMS

**Question:** NextSMS's `ZUKA EVENTS` sender ID never got approved despite the extensive live-debugging saga across September (wrong auth scheme discovered and fixed, wrong sender ID discovered and fixed, a direct-synchronous architecture rewrite) — every real send attempt still failed. The user asked to move the SMS integration to a different provider entirely.

**Choice:** HudumaSMS, a provider the user already had a working account with. `HudumaSmsProvider` (`lib/delivery/hudumasms.ts`) is a drop-in replacement for `NextSmsProvider`, implementing the same `DeliveryProvider` interface, called the same way from `delivery-actions.ts`. `NextSmsProvider`, its test file, and its 501-stub webhook route were deleted outright rather than kept dead in the tree — this is a full swap, not an additional option alongside SMS's existing WhatsApp alternative.

**Reasoning — verification method, not just the result:** every API detail (endpoint `https://api.huduma.cloud/api/v1/sms/send`, the `X-API-Key` auth header, the request body shape `{senderName, recipientPhone, message}`, and critically both the success response shape and a real error response shape) came from the user running two live `curl` commands against their actual account and pasting back the raw output — one real successful send (confirmed delivered) and one deliberate 401 with a wrong key. This is a stronger source than either of this project's two previous provider integrations: better than NextSMS's (a public blog post that turned out to have the wrong auth scheme, discovered only after a long debugging session) and better than WhatsApp's (web search cross-referenced against multiple sources, since Meta's own docs are unreachable from this sandbox, but still secondhand). Unit tests in `hudumasms.test.ts` assert against these exact captured response bodies rather than invented ones.

**First real send:** the first `curl` test was also the first real, successfully delivered SMS in this entire project's history — `ZUKAEVENTS` showed as an `Active` sender ID immediately on HudumaSMS, with no approval-pending period at all, unlike NextSMS. Confirmed again through the deployed app itself the same day: a guest's "Retry" button, previously failing with `missing_api_key` because `HUDUMASMS_API_KEY` hadn't been added to Vercel yet, succeeded once the key was set — the full path from UI click through `HudumaSmsProvider` to a delivered message works end-to-end, not just the raw API call.

**Schema note:** `delivery_events.provider` has a `CHECK` constraint (`0001_init.sql`) that only allowed `'nextsms' | 'whatsapp'`. `0006_hudumasms_provider.sql` adds `'hudumasms'` to that list. It deliberately does **not** remove `'nextsms'` — a `CHECK` constraint validates every existing row when replaced, so dropping it would break the migration on any project that already has real NextSMS-era `delivery_events` history (none exists in this project since no NextSMS send ever succeeded, but the migration is written to be safe regardless). `lib/types/database.ts`'s `DeliveryProvider` type keeps `"nextsms"` for the same reason — type-level accuracy for rows that could exist, even though no code path writes that value anymore.

**Not changed:** `lib/delivery/provider.ts`'s `SendMessageInput`/`SendMessageResult` shapes needed no changes — `HudumaSmsProvider` uses the same plain `{to, text}` shape `NextSmsProvider` did, since HudumaSMS (like NextSMS, unlike WhatsApp) sends free-form text with no template/approval requirement.

---

## 2026-10-10 — 5.8 Platform roles & access control

**Question:** Every event, from Phase 1 on, has belonged to whoever signed up and created it — a pure self-service model (`organisations.owner_user_id`, one user per org, one org owns its own events). The user asked for a fundamentally different model instead: a public landing page with a "Sign in" button, and three account roles — admin, customer, scanner — implementing least-privilege access. Events are created by the admin alone, who then assigns customer(s) and, optionally, a scanner to each one. Some events have no hired scanner at all; for those the admin instead grants the customer their own scan access on that same event.

This reopened two earlier decisions rather than just adding to them: it replaces self-service signup entirely, and it sits next to decision 5.7 (per-event PIN/join-code scanner access), which was explicitly chosen so door staff hired for one night never need a pre-provisioned account.

**Choice, confirmed with the user before building (three forks, all taken on the recommended option):**
1. **Admin is platform-wide**, not per-organisation — one admin tier (ZukaEvents' own operators) sees and creates every event across every customer, rather than each signed-up org getting its own internal admin/customer/scanner roles.
2. **Self-service signup is gone.** No public `/signup` anymore. Every account — admin, customer, or scanner — starts as an admin-sent invite. Accepting that invite (clicking the emailed link, then setting a password) *is* the email-verification step; there's no separate verification flow to build, since a bounced or unreachable invite email simply never gets accepted.
3. **The existing PIN/join-code scanner system is unchanged** (decision 5.7 stands as originally reasoned). A new, separate `scanner` profile role is for staff the admin pre-assigns ahead of time, or for granting a customer their own scan access on their own event — not a replacement for the fast, account-free door-staff flow.

**Schema (`0007_roles_and_access.sql`):**
- `profiles` (`id` -> `auth.users`, `role`: `admin`/`customer`/`scanner`, `email`, `full_name`). `email` is denormalized from `auth.users.email` specifically so the admin's "assign to event" form can look a user up with a plain table query — `auth.users` isn't queryable through the regular client at all, by design, and routing every lookup through the Admin API would have made a simple form needlessly heavy.
- `event_assignments` (`event_id`, `user_id`, `role`: `customer`/`scanner`, unique per triple). This is the whole mechanism: access to a specific event is "do you have a row here," not "do you own the org this event belongs to." A customer granted scan access on their own event is just a *second* assignment row for the same user on the same event — not a different account kind, not a separate table, not a special case anywhere in the RLS.
- `organisations` repurposed from the access-control boundary into a lightweight, admin-managed client directory (`owner_user_id` renamed to `created_by`, nullable) — still useful for grouping events under a client's name for display, no longer load-bearing for permissions.
- RLS: `auth_owns_event()` — the function `guests`, `delivery_events`, `check_ins`, and `scanner_codes`/`scanner_sessions` policies already all gated on — was **redefined in place** (`create or replace function`) rather than renamed, so none of those existing policies needed to change at all. It now means "admin, or has a `customer` row in `event_assignments` for this event" instead of "owns the org." Every table that already trusted that one function inherited the new access model for free. `events` itself got new policies directly (select: admin or any assignment row; insert: admin only; update: admin or assigned customer; delete: admin only).

**A `scanner`-role account is deliberately granted no direct RLS access to `guests` or `check_ins` in this migration.** Least privilege means a scanner account should never be able to read a guest's phone number, email, or notes just to validate a QR code at the door — it needs a narrow, security-definer validation function (same shape as `get_invite`/`submit_rsvp` from Phase 3) that returns only check-in-relevant fields. That function doesn't exist yet because the actual scanning UI doesn't exist yet (see below) — building the RLS access without the function to go with it would have meant either over-granting now or under-building the real feature later, so both are deferred together to the same follow-up pass.

**Two judgment calls made without a separate checkpoint**, flagged to the user rather than silently assumed:
1. An assigned customer can still **edit** their own event's details (venue, date, theme, etc.) after the admin creates it — only *creation* is admin-only, per the explicit requirement. Deletion is admin-only too (judged a safer default than letting a customer delete their own event outright).
2. `/dashboard` (guest list, CSV import, delivery status) is now shared between the `customer` and `admin` roles, rather than giving admin a duplicate copy of all that UI under `/admin`. Admin needs full operational access to help a customer's event along; RLS (admin passes every `auth_owns_event()` check unconditionally) already made this safe, so `lib/profile.ts`'s `requireAnyRole()` just had to let both roles into the route tree instead of only `customer`.

**What else changed:** public `/signup` deleted outright (not stubbed/redirected — it has no reason to exist). `/dashboard/events/new` (self-service event creation) deleted; event creation lives at `/admin/events/new` only, sharing the field-parsing/validation helpers (moved to `lib/event-form-fields.ts`, since a `"use server"` file's exports must all be callable Server Actions — the plain helpers couldn't stay in the old `app/dashboard/events/actions.ts` once `createEvent` moved out). New `/auth/set-password` page handles the "finish accepting an invite" step for every role. `scripts/seed-demo.mjs` and `supabase/seed/demo-seed.sql` updated to create a `profiles` row and an `event_assignments` row (not just an org) for the seeded user, since the dashboard now reads from `event_assignments`, not org ownership.

**Bootstrapping the first admin:** nothing in the UI can create the first admin account, by design — `inviteUser` itself requires an existing admin session. The only way in is via the Supabase dashboard directly: add a user under Authentication → Users, then insert their `profiles` row with `role = 'admin'` via the SQL Editor. Documented in README rather than built as a script, matching this project's existing posture of using the Supabase SQL Editor directly for one-off setup steps.

**Deferred, deliberately, to a follow-up pass:** the actual QR-scanning camera UI. Phase 5 (check-in/scanning) was never built in this project before this point — only its schema (`scanner_codes`, `scanner_sessions`, `check_ins`) existed. `/scan` currently just lists a scanner-role account's assigned events with a placeholder. Building the real thing needs its own decision: is it a true offline-capable PWA (the original brief's #1 non-negotiable, and `lib/supabase/admin.ts` already carries a doc comment anticipating "the PWA scanner's offline cache"), or an online-only v1 first? That's a real product/engineering trade-off, not something to assume silently the way the rest of this pass's judgment calls were small enough to just flag and proceed.

---

## 2026-10-10 — 5.9 Admin-set passwords (door staff can't always verify email)

**Problem, hit live:** the first real scanner invite under decision 5.8's model stalled — the invited scanner couldn't finish setting a password because their invite email either hadn't arrived or hadn't been accepted yet, so `/auth/set-password` had no session to act on. Email-verification-by-invite-link is a bad fit for the actual hiring pattern of door staff: hired same-day, often without reliable access to the inbox the admin used for the invite, with no time pressure to wait on mail delivery before the event starts.

**Choice:** `inviteUser` (`app/admin/users/actions.ts`) now takes an optional password field on the same form. Left blank, it's the original emailed-invite flow, unchanged. Filled in, it calls `supabase.auth.admin.createUser({email, password, email_confirm: true})` instead — creates the account immediately, `email_confirm: true` skips Supabase's own confirmation requirement, no email sent at all. The admin is responsible for getting that password to the person directly (tell them in person, message it) — there's nothing to click, nothing to wait on.

Added alongside it: `setUserPassword`, a new action letting the admin reset *any* existing account's password the same way (`auth.admin.updateUserById`), reachable from Users → "Set password" on any row (`/admin/users/[id]/password`). This is also the project's only password-recovery path — there's no self-service "forgot password" flow, consistent with decision 5.8's "no self-service anything" posture, so admin-reset is how a locked-out user (of any role, not just scanner) gets back in.

**Why this doesn't weaken anything:** both paths still go through the same admin-only `createUser`/`inviteUserByEmail` choice at account-creation time (`inviteUser` already required `requireRole(supabase, "admin")`), and `setUserPassword` requires the same. Nothing here is reachable by anyone but an authenticated admin. Passwords are written, never read back — Supabase Auth hashes them; there's no "view current password" anywhere, by construction, not by omission.

---

## 2026-10-10 — 5.10 Phase 5, v1: online-only QR check-in

**Question:** decision 5.8 deferred the actual scanning UI, flagging a real trade-off: build it as a true offline-capable PWA from the start (the original brief's #1 non-negotiable), or ship an online-only v1 first and add offline later. Asked the user directly rather than assuming; they chose online-only first.

**Scope of this pass:** the authenticated-scanner-account flow only (`/scan/[eventId]`, reachable by a dedicated `scanner` profile, an admin, or a customer holding an admin-granted `scanner` event_assignments row on their own event). The separate per-event PIN/join-code system for one-night hired door staff (decision 5.7 — `scanner_codes`, `scanner_sessions`) is untouched; it still has no check-in write path of its own, same as before this pass, and is still deliberately the right tool for its specific case (staff with no pre-provisioned account). The two systems aren't related beyond sharing the same `check_ins` table and `result` values.

**Schema (`0008_scan_checkin.sql`):**
- `check_ins.guest_id` made nullable. It was `NOT NULL` since 0001_init.sql, but the `result` check constraint already allowed `'invalid'` (a scanned code matching no guest at all) — there's no guest row to reference in that case, so the original schema couldn't actually log the one result value it already named. One-column fix, flagged rather than silently loosened since it relaxes a constraint on an existing table.
- `scan_check_in(p_event_id, p_token, p_gate_label)` — same shape as `get_invite`/`submit_rsvp` (Phase 3): a narrow, security-definer function, not a broad RLS grant on `guests`/`check_ins`. This is the function decision 5.8 explicitly deferred building. Authorization is `is_admin()` or `has_event_role(p_event_id, 'scanner')` — deliberately **not** `'customer'` too: an assigned customer without an explicit scanner grant still can't scan their own event, matching 5.8's framing of that as a separate, admin-granted capability rather than something owning the event implies. One `check_ins` row is always written, whatever the result, preserving the append-only table's purpose as a complete audit trail (including junk/garbage scans, now that `guest_id` can be null for those).
- `p_event_id` is the event the *scan is happening at* (the device's selected event), intentionally independent of the token's actual `guests.event_id` — comparing the two inside the function is how `'wrong_event'` gets detected, matching the "denormalized from guests.event_id" comment on `check_ins.event_id` in the original 0001_init.sql schema note (it's a copy that's expected to legitimately diverge from the guest's real event on exactly this result).

**QR reading — new dependency, confirmed with the user first:** camera-based scanning needs either the browser's native `BarcodeDetector` API (zero new dependencies, but only reliably available on Chromium-based browsers — Chrome/Edge on Android, not Safari/iOS) or a JS library with broader device support. Asked the user explicitly, since this project requires approval before adding any npm package; they chose the library over the native-only option. Added `html5-qrcode@2.3.8` (Apache-2.0) — handles camera permission UI, device/back-camera selection, and decode-loop plumbing; `app/scan/[eventId]/scan-client.tsx` wraps it with the app's own result UI (guest name, category/table, a colored status badge per `CheckInResult`) rather than using its built-in scanner chrome. A manual text-entry fallback sits alongside the camera for devices where it can't get a camera stream at all.

**Token handling:** a guest's QR encodes their full invite URL (`${siteUrl}/i/${token}`, unchanged from Phase 3 — see `lib/qr.ts` and `app/i/[token]/page.tsx`), not a bare token. `extractToken()` in `app/scan/[eventId]/actions.ts` takes the last `/`-separated path segment, which also makes the manual-entry fallback accept either a pasted full link or a bare token typed in by hand.

**`npm install` surfaced 8 pre-existing vulnerabilities (7 high, 1 critical)** in unrelated packages already in the tree — `next` itself (a critical RCE in `next/og ImageResponse`, GHSA-vcvr-r3jv-pc5j, among several others fixed in 16.4.0), `sharp`, `source-map-js`, and `braces` (via `eslint-config-next`, dev-only). None are new: `html5-qrcode` itself added exactly one package with no vulnerable transitive dependencies. Flagged to the user as a separate, pre-existing item — not fixed as part of this pass, since `next@16.4.0` is a version bump outside this change's scope and deserves its own look rather than a drive-by `npm audit fix --force`.

**Deferred to v2, by the user's explicit choice:** offline support — queuing scans in local storage when the device has no connection and syncing once it does, which is the original brief's #1 non-negotiable. Every scan in this v1 is a live round-trip to `scan_check_in()`; a venue with unreliable connectivity (the stated norm for Tanzanian venues per the brief) will see scans simply fail to submit rather than queue. This is a known, accepted gap for v1, not an oversight.

---

## 2026-10-10 — 5.11 Scanner + customer attendee list

**Request:** both a scanner and the event's customer should be able to see the full guest list with each person's current check-in status, not just scan codes one at a time — e.g. answering "has the Mwangi family arrived yet?" without scanning anyone.

**Customer side:** no new backend needed. A customer already has full RLS access to their own event's `guests` rows (unchanged by this pass); `app/dashboard/events/[eventId]/guests/page.tsx` just wasn't selecting or displaying `checked_in_at`/`checked_in_gate`. Added a "Checked in" column (badge + timestamp + gate, same visual language as the RSVP/delivery columns already there).

**Scanner side:** needed a new function — a `scanner` profile still has no direct RLS access to `guests` (decision 5.8's least-privilege stance, upheld again in 5.10's `scan_check_in()`), so a plain `.from("guests").select()` was never an option. `scan_list_guests(p_event_id)` (`0009_scan_guest_list.sql`) is the same shape again: security-definer, same authorization as `scan_check_in()` (`is_admin()` or a `'scanner'` row on this event, raising on anything else), returning only check-in-relevant fields — no phone, email, notes, or dietary info, same omissions as `get_invite`. `/scan/[eventId]/guests` renders it with a client-side search box (name/category/table) and a "N / total checked in" count; cross-linked with the scan screen itself ("Guest list" / "Scan" buttons each way).

---

## 2026-10-10 — 5.12 Public landing page redesign

**Request:** recreate the public landing page (`app/page.tsx`) to mimic a reference screenshot — a richer marketing-site layout (sticky nav, hero with a visual card, a feature strip, a 6-card feature grid, a numbered "how it works," a split content section, a closing CTA band, footer) — modernized, with animations.

**Visual structure matched closely**; copy and features were rewritten to describe what this product actually does, not transcribed from the reference. The reference was a generic template mockup whose copy didn't match this product in three concrete ways, each adapted rather than copied:
1. **CTAs.** The reference has both "Sign in" and "Create your event" in the nav/hero/CTA band — a self-serve signup flow. This product has none (decision 5.8: every account is admin-provisioned). Every CTA here points at `/login`, with the existing "Accounts are set up by your event admin" line kept near the primary one.
2. **Pricing tiers.** The reference showed three fabricated tiers (a free plan, "KES 2,500/event," "unlimited/let's talk") with M-Pesa payment claims. None of that exists — there's no billing system, no self-serve checkout, no payment processing built or planned at this stage (`contributions`/payments were explicitly marked out of scope earlier in this project). Publishing invented prices on a real product's live page would be actively misleading, not just a stylistic liberty, so the section was dropped rather than filled with placeholder numbers.
3. **Scope claims.** The reference says "Built for East Africa" / "Kenya and Tanzania" and claims offline-capable check-in. This product is Tanzania-only by construction (`Africa/Dar_es_Salaam` timezone, Tanzanian phone-number validation, `en`/`sw` language toggle — nothing Kenya-specific exists), and scanning is online-only as of decision 5.10 (offline is explicitly deferred to v2). Copy says "Built for Tanzania" and lists real, shipped capabilities (WhatsApp-first delivery, Swahili/English invites, Tanzanian phone validation) instead.

Every other section's content was pulled from what's actually built: the "system features" grid names the 5 fixed themes, QR entry, guest management, the live attendee list (decision 5.11), automatic WhatsApp/SMS sending; "how it works" matches the real event → invite → RSVP → scan flow.

**Animations — no new dependency.** `components/ui/reveal.tsx` is a small IntersectionObserver wrapper (`.reveal`/`.is-visible` in `app/globals.css`) that fades+rises each section in once as it scrolls into view; above-the-fold hero content uses a plain staggered CSS `fade-in-up` instead, since it's visible immediately and has nothing to scroll past. A couple of blurred, slowly-drifting gradient blobs (`@keyframes blob-drift`) sit behind the hero and the closing CTA card, and the hero's two floating "RSVP confirmed" / "Checked in ✓" badges bob gently (`float-slow`/`float-slower`) — all CSS, all disabled under `prefers-reduced-motion: reduce`. Verified by scripted Playwright screenshots: one before any scroll (confirms sections wait to reveal rather than rendering broken/empty) and one after scrolling the full page (confirms every section actually renders once triggered).

**New files:** `components/landing/` (nav, hero, feature-strip, system-features, how-it-works, tanzania-section, final-cta, footer, icons — hand-drawn inline SVGs matching `NavArrows`' stroke style, not an icon library) and `components/ui/reveal.tsx`. `app/page.tsx` keeps its existing signed-in-redirect logic unchanged, now rendering these sections instead of the old single-column layout.

---

## 2026-10-10 — 5.13 Landing page: themes and pricing sections

**Request:** add a themes section (card templates for customers to browse) and a pricing section to the landing page, with real rates: SMS 100 Tsh, WhatsApp 1000 Tsh per message, plus a worked-example formula for both card and message pricing.

**Resolved a contradiction before building anything**, rather than guessing: the user's own worked example ("3 × 100 × 1,500 Tsh = 450,000 Tsh") used 1,500 Tsh/message, which matches neither the stated SMS (100) nor WhatsApp (1000) rate. Asked directly — confirmed 100/1000 are correct and 1,500 was a leftover placeholder from wherever that example text originated, not a real third rate. Also asked whether the 5 real themes (Classic/Garden/Royal/Sunset/Waves) share one card price or each has its own, since only an illustrative "50 Tsh" example was given and no real per-theme breakdown — confirmed flat 50 Tsh/card across all five. Didn't fabricate any of these numbers; this is real pricing copy going on a live page.

**Themes section** (`components/landing/themes-section.tsx`, `#themes`): 5 cards using the exact same names and hex colors as the real fixed theme catalog seeded by `0003_public_invite_access.sql` (decision 5.6). Kept as a static array rather than querying the `themes` table — the landing page is unauthenticated, and `themes_select_authenticated` (`0002_rls.sql`) only grants `SELECT` to signed-in users, so a live query would need its own RLS change for what's otherwise just display copy matching data that already exists elsewhere in the codebase. Flagged in a code comment: if the real theme palette ever changes, this file needs a matching update since nothing enforces the two stay in sync.

**Pricing section** (`components/landing/pricing-section.tsx`, `#pricing`): three rate cards (cards, SMS, WhatsApp) each with a correctly-computed worked example, plus a combined example mirroring the user's own "invite + 2 reminders" framing (3 × 100 guests × 1000 Tsh WhatsApp = 300,000 Tsh), fixed to the confirmed rate rather than carrying over the inconsistent 1,500 figure. Purely informational, like the rest of the landing page since decision 5.12 — there's still no billing/checkout system in this product, so every CTA continues to route to `/login`, not a payment flow. Nav and footer link lists extended to include both new sections (`Pricing` replaces nothing; `Themes` added alongside `Features`/`How it works`).

---

## 2026-10-10 — 5.14 Card price correction: 50 → 1500 Tsh

**What happened:** immediately after 5.13 shipped, the user said "An invitation card costs 1500, so the example should be 3X100X1500 = 450000" — reintroducing the exact 1,500 figure that had just been resolved as a leftover placeholder, but now asserting it as the real card price. Two follow-up rounds of `AskUserQuestion` were needed because the first two answers contradicted each other (card = 1,500 with SMS/WhatsApp unchanged at 100/1000, vs. a ×3 messaging formula implying SMS or WhatsApp was actually 1,500) — rather than pick one silently, asked a third, maximally explicit question listing all three final numbers together. Confirmed: **card 1,500 Tsh, SMS 100 Tsh, WhatsApp unchanged at 1,000 Tsh.**

**Change:** `CARD_PRICE_TSH` in `pricing-section.tsx` updated from 50 to 1500 (its worked example now reads `100 guests × 1,500 Tsh = 150,000 Tsh`). SMS, WhatsApp, and the combined ×3 WhatsApp example are untouched — the ×3 formula was confirmed to still describe a WhatsApp-messaging scenario, not cards, despite using the same 1,500-looking number that triggered this whole correction; the two are coincidentally similar-looking but unrelated figures. The themes section (`themes-section.tsx`) already had its per-card price badges removed in the prior turn, so no display there needed updating — just this one constant.
