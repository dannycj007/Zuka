-- Phase 5 follow-up: a read-only attendee list for the door, not just
-- the scan screen itself. A scanner needs to see who's expected and
-- who's already arrived without having to scan every guest's code to
-- find out (e.g. answering "has the Mwangi family arrived yet?").
--
-- Same shape and same reasoning as scan_check_in()
-- (0008_scan_checkin.sql) and get_invite (0003_public_invite_access.sql)
-- before it: a narrow security-definer function returning only
-- check-in-relevant fields, not a broad RLS grant on `guests`. A
-- scanner account still never gets direct SELECT on `guests` — it still
-- doesn't need a guest's phone number, email, or notes to work a door.
--
-- Authorization matches scan_check_in() exactly (admin, or an explicit
-- 'scanner' event_assignments row on this event) — not 'customer' too,
-- same reasoning: owning the event doesn't imply scan access, an admin
-- grant does.

create or replace function scan_list_guests(p_event_id uuid)
returns table (
  guest_id uuid,
  full_name text,
  salutation text,
  category text,
  table_label text,
  seats_allotted int,
  rsvp_status text,
  checked_in_at timestamptz,
  checked_in_gate text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (is_admin() or has_event_role(p_event_id, 'scanner')) then
    raise exception 'not authorized to view this event''s guest list';
  end if;

  return query
    select g.id, g.full_name, g.salutation, g.category, g.table_label, g.seats_allotted,
           g.rsvp_status, g.checked_in_at, g.checked_in_gate
    from guests g
    where g.event_id = p_event_id
    order by g.full_name;
end;
$$;

revoke all on function scan_list_guests(uuid) from public;
grant execute on function scan_list_guests(uuid) to authenticated;
