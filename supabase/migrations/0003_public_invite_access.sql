-- Phase 3: guest invite page support.
--
-- Two things here that intentionally do NOT go through normal RLS-scoped
-- client queries, because the caller is an unauthenticated guest holding
-- only a capability token, not a Supabase session:
--
--   1. get_invite(token)   — looks up a guest + their event + theme by
--      invite token, returning ONLY public-safe fields (no phone, email,
--      notes, dietary, checked_in_*, or the token itself). This is the
--      alternative to a broad anon SELECT policy on `guests`, which would
--      have exposed those fields to anyone who could guess/enumerate a
--      lookup, per the security note in Phase 1's RLS design.
--
--   2. submit_rsvp(token, status) — the one write a guest is allowed to
--      make, gated entirely on knowing the token (the capability-URL
--      model from section 8 of the brief: holding the token IS being
--      that guest). Silently no-ops on an unknown token rather than
--      raising, so it can't be used to test which tokens exist.
--
-- Both are SECURITY DEFINER, run with a fixed search_path, and are
-- granted to `anon` (and `authenticated`, so an organiser previewing
-- their own invite link also works) — nothing else on `guests` is opened
-- up.

-- FIXED THEME CATALOG (decision 5.6: 3-5 fixed themes, no designer) -------
-- themes.name had no uniqueness constraint from 0001 (nothing wrote more
-- than one row before now); add one so this seed can upsert by name, both
-- here and on any future re-run of this migration.

alter table themes add constraint themes_name_key unique (name);

-- Upsert by name so the Phase 1 seed scripts' placeholder "Classic" theme
-- (config: {}) gets its real palette filled in rather than duplicated.
insert into themes (name, config) values
  ('Classic', '{"colors":{"background":"#FBF8F3","foreground":"#2B2420","card":"#FFFFFF","cardForeground":"#2B2420","accent":"#A67C1F","accentForeground":"#FFFFFF","muted":"#7A6F63"}}'),
  ('Garden',  '{"colors":{"background":"#F1F7EF","foreground":"#1F2E22","card":"#FFFFFF","cardForeground":"#1F2E22","accent":"#3F7A4E","accentForeground":"#FFFFFF","muted":"#5C6B5E"}}'),
  ('Royal',   '{"colors":{"background":"#0E1F3C","foreground":"#F3EEDD","card":"#16294A","cardForeground":"#F3EEDD","accent":"#D4AF37","accentForeground":"#16294A","muted":"#A9B4C9"}}'),
  ('Sunset',  '{"colors":{"background":"#FFF2E6","foreground":"#4A2412","card":"#FFFFFF","cardForeground":"#4A2412","accent":"#E0632B","accentForeground":"#FFFFFF","muted":"#8C6250"}}'),
  ('Waves',   '{"colors":{"background":"#E9F6F6","foreground":"#0C3636","card":"#FFFFFF","cardForeground":"#0C3636","accent":"#12897F","accentForeground":"#FFFFFF","muted":"#4C7574"}}')
on conflict (name) do update set config = excluded.config;

-- GET_INVITE ---------------------------------------------------------------

create or replace function get_invite(p_token text)
returns table (
  guest_id uuid,
  full_name text,
  salutation text,
  category text,
  table_label text,
  seats_allotted int,
  rsvp_status text,
  event_id uuid,
  event_name text,
  event_type text,
  starts_at timestamptz,
  venue_name text,
  venue_address text,
  venue_lat double precision,
  venue_lng double precision,
  language text,
  theme_config jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    g.id, g.full_name, g.salutation, g.category, g.table_label, g.seats_allotted, g.rsvp_status,
    e.id, e.name, e.event_type, e.starts_at, e.venue_name, e.venue_address, e.venue_lat, e.venue_lng, e.language,
    t.config
  from guests g
  join events e on e.id = g.event_id
  left join themes t on t.id = e.theme_id
  where g.invite_token = p_token;
$$;

revoke all on function get_invite(text) from public;
grant execute on function get_invite(text) to anon, authenticated;

-- SUBMIT_RSVP ----------------------------------------------------------

create or replace function submit_rsvp(p_token text, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('yes', 'no', 'maybe') then
    raise exception 'invalid rsvp status';
  end if;

  update guests
  set rsvp_status = p_status, rsvp_at = now()
  where invite_token = p_token;
end;
$$;

revoke all on function submit_rsvp(text, text) from public;
grant execute on function submit_rsvp(text, text) to anon, authenticated;
