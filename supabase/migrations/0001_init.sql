-- ZukaEvents schema, Phase 1.
-- Shape approved 2026-09-19 (see DECISIONS.md and the Phase 1 proposal).
--
-- Two deviations from the original brief's section-4 table list, both
-- flagged and approved:
--   1. check_ins.event_id — denormalized from guests.event_id, needed to
--      validate a scan against "does this guest belong to this event"
--      and for per-event/per-gate breakdowns without a join on every read.
--   2. scanner_codes / scanner_sessions — new tables implementing decision
--      5.7 (per-event PIN/join-code auth for door staff, who are never
--      Supabase auth users).

create extension if not exists "pgcrypto";

-- ORGANISATIONS --------------------------------------------------------

create table organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- THEMES -----------------------------------------------------------------
-- Shared, fixed catalog across all orgs (decision 5.6: 3-5 fixed themes,
-- no designer in v1). Seeded separately, not by this migration.

create table themes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  config jsonb not null default '{}'::jsonb,
  preview_url text,
  created_at timestamptz not null default now()
);

-- EVENTS -------------------------------------------------------------------

create table events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations (id) on delete cascade,
  name text not null,
  event_type text not null,
  starts_at timestamptz not null,
  timezone text not null default 'Africa/Dar_es_Salaam',
  venue_name text,
  venue_address text,
  venue_lat double precision,
  venue_lng double precision,
  theme_id uuid references themes (id),
  language text not null default 'en' check (language in ('en', 'sw')),
  status text not null default 'draft' check (status in ('draft', 'live', 'closed')),
  created_at timestamptz not null default now()
);

create index events_org_id_idx on events (org_id);

-- GUESTS -------------------------------------------------------------------

create table guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  full_name text not null,
  salutation text,
  phone_e164 text not null,
  email text,
  category text,
  table_label text,
  seats_allotted int not null default 1,
  notes text,
  dietary text,
  -- Capability-URL token. >=128 bits entropy, URL-safe base62, generated
  -- in application code (lib/invite-token.ts). Never derived from phone,
  -- name, or a sequence. Keep out of logs, analytics, and error messages.
  invite_token text not null,
  rsvp_status text not null default 'pending' check (rsvp_status in ('pending', 'yes', 'no', 'maybe')),
  rsvp_at timestamptz,
  plus_ones_confirmed int not null default 0,
  latest_delivery_status text,
  checked_in_at timestamptz,
  checked_in_by uuid references auth.users (id),
  checked_in_gate text,
  created_at timestamptz not null default now()
);

create unique index guests_invite_token_key on guests (invite_token);
create index guests_event_id_idx on guests (event_id);

-- SCANNER CODES / SESSIONS (new — implements decision 5.7) -----------------

create table scanner_codes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  code text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (event_id, code)
);

create table scanner_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  scanner_code_id uuid not null references scanner_codes (id) on delete cascade,
  device_id text not null,
  gate_label text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index scanner_codes_event_id_idx on scanner_codes (event_id);
create index scanner_sessions_event_id_idx on scanner_sessions (event_id);

-- DELIVERY_EVENTS (append-only) ---------------------------------------------

create table delivery_events (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references guests (id) on delete cascade,
  event_id uuid not null references events (id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'sms')),
  status text not null check (status in ('queued', 'sent', 'delivered', 'read', 'failed')),
  provider text not null check (provider in ('nextsms', 'whatsapp')),
  provider_message_id text,
  error_code text,
  error_message text,
  attempt_number int not null default 1,
  created_at timestamptz not null default now()
);

create index delivery_events_guest_id_created_at_idx on delivery_events (guest_id, created_at);

-- CHECK_INS (append-only) ---------------------------------------------------

create table check_ins (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references guests (id) on delete cascade,
  event_id uuid not null references events (id) on delete cascade,
  scanned_at timestamptz not null default now(),
  scanned_by_user_id uuid references auth.users (id),
  scanner_session_id uuid references scanner_sessions (id),
  gate_label text,
  device_id text,
  result text not null check (result in ('valid', 'duplicate', 'invalid', 'wrong_event')),
  synced_at timestamptz,
  client_scanned_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index check_ins_guest_id_idx on check_ins (guest_id);
create index check_ins_event_id_idx on check_ins (event_id);

-- DENORMALIZED SUMMARY SYNC --------------------------------------------
-- guests.checked_in_* and guests.latest_delivery_status are read-optimized
-- copies of the append-only logs above, kept in sync by trigger so a
-- job-runner outage can never desync the dashboard from the source of
-- truth in check_ins / delivery_events.

create function sync_guest_checkin() returns trigger as $$
begin
  if new.result = 'valid' then
    update guests
    set checked_in_at = new.scanned_at,
        checked_in_by = new.scanned_by_user_id,
        checked_in_gate = new.gate_label
    where id = new.guest_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger check_ins_sync_guest
  after insert on check_ins
  for each row execute function sync_guest_checkin();

create function sync_guest_delivery_status() returns trigger as $$
begin
  update guests set latest_delivery_status = new.status where id = new.guest_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger delivery_events_sync_guest
  after insert on delivery_events
  for each row execute function sync_guest_delivery_status();
