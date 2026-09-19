-- Row Level Security for all Phase 1 tables.
--
-- Every table gets RLS. Organiser-facing tables are scoped to rows owned,
-- directly or transitively, by the authenticated user via
-- organisations.owner_user_id. delivery_events and check_ins get SELECT
-- policies only — every insert into either happens server-side with the
-- service-role key (the job runner for delivery_events; a validated PIN
-- sync route for check_ins, since door staff authenticate via scanner
-- codes, not Supabase auth, and never hold a session RLS could check).
-- The service role bypasses RLS entirely, so no insert policy is needed
-- for those server paths.
--
-- The guest-facing public read path (/i/[token]) is deliberately NOT a
-- policy here — it doesn't exist until Phase 3, and giving guests direct
-- anon SELECT access to a table holding phone numbers and notes is the
-- wrong shape for it. That page will call a security-definer function
-- that returns only public-safe fields, added in the Phase 3 migration.

-- Helper functions -----------------------------------------------------

create function auth_owns_org(p_org_id uuid) returns boolean as $$
  select exists (
    select 1 from organisations o
    where o.id = p_org_id and o.owner_user_id = auth.uid()
  );
$$ language sql stable security definer set search_path = public;

create function auth_owns_event(p_event_id uuid) returns boolean as $$
  select exists (
    select 1 from events e
    join organisations o on o.id = e.org_id
    where e.id = p_event_id and o.owner_user_id = auth.uid()
  );
$$ language sql stable security definer set search_path = public;

-- ORGANISATIONS ----------------------------------------------------------

alter table organisations enable row level security;

create policy organisations_select_own on organisations
  for select using (owner_user_id = auth.uid());

create policy organisations_insert_own on organisations
  for insert with check (owner_user_id = auth.uid());

create policy organisations_update_own on organisations
  for update using (owner_user_id = auth.uid());

create policy organisations_delete_own on organisations
  for delete using (owner_user_id = auth.uid());

-- THEMES -------------------------------------------------------------------
-- Fixed catalog, shared across orgs. Readable by any signed-in organiser;
-- writable only by the service role (no self-service theme creation).

alter table themes enable row level security;

create policy themes_select_authenticated on themes
  for select to authenticated using (true);

-- EVENTS ---------------------------------------------------------------

alter table events enable row level security;

create policy events_select_own_org on events
  for select using (auth_owns_org(org_id));

create policy events_insert_own_org on events
  for insert with check (auth_owns_org(org_id));

create policy events_update_own_org on events
  for update using (auth_owns_org(org_id));

create policy events_delete_own_org on events
  for delete using (auth_owns_org(org_id));

-- GUESTS -------------------------------------------------------------------

alter table guests enable row level security;

create policy guests_select_own_event on guests
  for select using (auth_owns_event(event_id));

create policy guests_insert_own_event on guests
  for insert with check (auth_owns_event(event_id));

create policy guests_update_own_event on guests
  for update using (auth_owns_event(event_id));

create policy guests_delete_own_event on guests
  for delete using (auth_owns_event(event_id));

-- SCANNER CODES / SESSIONS -------------------------------------------------
-- Organisers manage codes for their own events. Sessions are created by
-- the server-side PIN-login route (service role) but organisers can view
-- which devices are currently checked in at their event.

alter table scanner_codes enable row level security;

create policy scanner_codes_select_own_event on scanner_codes
  for select using (auth_owns_event(event_id));

create policy scanner_codes_insert_own_event on scanner_codes
  for insert with check (auth_owns_event(event_id));

create policy scanner_codes_update_own_event on scanner_codes
  for update using (auth_owns_event(event_id));

create policy scanner_codes_delete_own_event on scanner_codes
  for delete using (auth_owns_event(event_id));

alter table scanner_sessions enable row level security;

create policy scanner_sessions_select_own_event on scanner_sessions
  for select using (auth_owns_event(event_id));

-- DELIVERY_EVENTS ------------------------------------------------------
-- Append-only. Organisers can read their own event's history. No insert
-- policy: writes come from the job runner via the service role only.

alter table delivery_events enable row level security;

create policy delivery_events_select_own_event on delivery_events
  for select using (auth_owns_event(event_id));

-- CHECK_INS --------------------------------------------------------------
-- Append-only. Organisers can read their own event's history. No insert
-- policy: writes come from the validated scanner-sync route via the
-- service role only.

alter table check_ins enable row level security;

create policy check_ins_select_own_event on check_ins
  for select using (auth_owns_event(event_id));
