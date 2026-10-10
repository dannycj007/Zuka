-- Access-control rearchitecture (see DECISIONS.md, 2026-10-10 "Platform
-- roles" entry). Replaces the old "sign up -> create your own org -> own
-- every event in it" model with: a single platform-wide admin creates
-- every event and grants access to it.
--
-- Three account roles (profiles.role): 'admin', 'customer', 'scanner'.
-- Access to a specific event is no longer "do you own the org this event
-- belongs to" — it's "do you have an event_assignments row for this
-- event". A customer can hold BOTH a 'customer' row and a 'scanner' row
-- on the same event (the "customer does their own door, no scanner
-- hired" case) — that's just a second assignment row, not a different
-- account kind.
--
-- The existing PIN/join-code scanner system (scanner_codes,
-- scanner_sessions — decision 5.7) is UNCHANGED. It stays the fast path
-- for one-night hired door staff who should never need a pre-provisioned
-- account. The new 'scanner' profile role is for staff the admin
-- pre-assigns ahead of time, and is deliberately not granted direct RLS
-- access to guests/check_ins here — that needs a narrow, security-definer
-- validation function (same shape as get_invite/submit_rsvp from Phase
-- 3), which is follow-up work once the actual scanning UI is built, not
-- part of this migration.

-- TABLES -----------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'customer', 'scanner')),
  full_name text,
  -- Denormalized from auth.users.email, set once at invite time. Lets
  -- the admin "assign to event" form look a user up by email with a
  -- plain table query instead of the Admin API (auth.users isn't
  -- queryable through the regular client at all, by design).
  email text not null,
  created_at timestamptz not null default now()
);

create unique index profiles_email_key on profiles (email);

create table event_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('customer', 'scanner')),
  created_at timestamptz not null default now(),
  unique (event_id, user_id, role)
);

create index event_assignments_event_id_idx on event_assignments (event_id);
create index event_assignments_user_id_idx on event_assignments (user_id);

-- ORGANISATIONS -------------------------------------------------------------
-- Repurposed from "the tenant that owns everything" to a lightweight,
-- admin-managed client directory (e.g. "The Mwangi Family") purely for
-- grouping/display. No longer the access-control boundary.

alter table organisations rename column owner_user_id to created_by;
alter table organisations alter column created_by drop not null;

drop policy organisations_select_own on organisations;
drop policy organisations_insert_own on organisations;
drop policy organisations_update_own on organisations;
drop policy organisations_delete_own on organisations;

-- HELPER FUNCTIONS -----------------------------------------------------

create function is_admin() returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql stable security definer set search_path = public;

create function has_event_role(p_event_id uuid, p_role text) returns boolean as $$
  select exists (
    select 1 from event_assignments
    where event_id = p_event_id and user_id = auth.uid() and role = p_role
  );
$$ language sql stable security definer set search_path = public;

-- Redefined, not dropped-and-recreated with a new name: guests,
-- delivery_events, check_ins, and scanner_codes/scanner_sessions all
-- already gate their policies on auth_owns_event(event_id). Changing
-- what it MEANS (admin, or the assigned customer) means none of those
-- policies need to be touched — they adopt the new access model for
-- free. Scanner-role accounts deliberately do NOT satisfy this function;
-- see the migration-level comment above for why.
create or replace function auth_owns_event(p_event_id uuid) returns boolean as $$
  select is_admin() or has_event_role(p_event_id, 'customer');
$$ language sql stable security definer set search_path = public;

drop function if exists auth_owns_org(uuid);

-- RLS: PROFILES ----------------------------------------------------------

alter table profiles enable row level security;

create policy profiles_select_own on profiles
  for select using (id = auth.uid());

create policy profiles_admin_all on profiles
  for all using (is_admin()) with check (is_admin());

-- RLS: EVENT_ASSIGNMENTS -------------------------------------------------

alter table event_assignments enable row level security;

create policy event_assignments_select_own on event_assignments
  for select using (user_id = auth.uid());

create policy event_assignments_admin_all on event_assignments
  for all using (is_admin()) with check (is_admin());

-- RLS: ORGANISATIONS ------------------------------------------------------

create policy organisations_admin_all on organisations
  for all using (is_admin()) with check (is_admin());

create policy organisations_select_assigned on organisations
  for select using (
    exists (
      select 1 from events e
      where e.org_id = organisations.id and auth_owns_event(e.id)
    )
  );

-- RLS: EVENTS --------------------------------------------------------------
-- Visible to admin, or anyone with ANY assignment row (customer or
-- scanner — a scanner needs to see which event they're scanning for).
-- Only admin can create or delete. Admin or the assigned customer can
-- update event details (venue, date, theme, etc.) — creation is
-- admin-only per the explicit requirement, but letting the assigned
-- customer keep editing their own event's details preserves the
-- self-serve editing experience that already existed.

drop policy events_select_own_org on events;
drop policy events_insert_own_org on events;
drop policy events_update_own_org on events;
drop policy events_delete_own_org on events;

create policy events_select on events
  for select using (
    is_admin() or exists (
      select 1 from event_assignments
      where event_id = events.id and user_id = auth.uid()
    )
  );

create policy events_insert on events
  for insert with check (is_admin());

create policy events_update on events
  for update using (is_admin() or has_event_role(events.id, 'customer'));

create policy events_delete on events
  for delete using (is_admin());
