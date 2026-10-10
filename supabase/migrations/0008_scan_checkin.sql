-- Phase 5, v1: online-only QR check-in for authenticated scanner access
-- (see DECISIONS.md, 2026-10-10 "Online-only scan v1"). Explicitly NOT
-- in scope here: the PIN/join-code door-staff flow (scanner_codes,
-- scanner_sessions — decision 5.7), which still has no check-in write
-- path of its own and stays that way until it's actually built. This
-- migration only wires up the path for accounts that log in — a
-- dedicated 'scanner' profile, an admin, or a customer explicitly
-- granted a 'scanner' event_assignments row on their own event.
--
-- CHECK_INS.GUEST_ID NULLABLE -----------------------------------------
-- 0001_init.sql's check_ins.result check constraint already allowed
-- 'invalid' (a scanned token matching no guest at all) alongside
-- 'duplicate'/'wrong_event'/'valid', but guest_id was NOT NULL — there's
-- no guest row to reference when the token doesn't match anything. That
-- made 'invalid' unloggable as written. Loosening this is the one
-- schema change here; every other column keeps its existing shape.

alter table check_ins alter column guest_id drop not null;

-- SCAN_CHECK_IN ----------------------------------------------------------
-- Same shape as get_invite/submit_rsvp (0003_public_invite_access.sql):
-- a narrow, security-definer function returning only check-in-relevant
-- fields, rather than granting the calling role direct SELECT on
-- `guests`. This is the function decision 5.8 deferred — a 'scanner'
-- profile still has no RLS access to guests/check_ins itself.
--
-- Authorization is admin or an explicit 'scanner' assignment row on
-- THIS event — deliberately not "any assignment role," so an assigned
-- customer without a scanner grant still can't scan (that grant is a
-- separate admin action per decision 5.8, not implied by owning the
-- event).
--
-- p_event_id is the event the scan is happening AT (the device's
-- selected event), independent of which event the token's guest
-- actually belongs to — comparing the two is exactly how 'wrong_event'
-- gets detected. One row is always inserted into check_ins, whatever
-- the result, as the complete audit trail the append-only table is for.

create or replace function scan_check_in(
  p_event_id uuid,
  p_token text,
  p_gate_label text default null
)
returns table (
  result text,
  guest_id uuid,
  full_name text,
  salutation text,
  category text,
  table_label text,
  seats_allotted int,
  checked_in_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest guests%rowtype;
  v_result text;
  v_now timestamptz := now();
begin
  if not (is_admin() or has_event_role(p_event_id, 'scanner')) then
    raise exception 'not authorized to scan this event';
  end if;

  select * into v_guest from guests g where g.invite_token = p_token;

  if v_guest.id is null then
    v_result := 'invalid';
  elsif v_guest.event_id <> p_event_id then
    v_result := 'wrong_event';
  elsif v_guest.checked_in_at is not null then
    v_result := 'duplicate';
  else
    v_result := 'valid';
  end if;

  insert into check_ins (
    guest_id, event_id, scanned_by_user_id, gate_label, result, client_scanned_at, scanned_at
  )
  values (
    v_guest.id, p_event_id, auth.uid(), p_gate_label, v_result, v_now, v_now
  );

  return query select
    v_result,
    v_guest.id,
    v_guest.full_name,
    v_guest.salutation,
    v_guest.category,
    v_guest.table_label,
    v_guest.seats_allotted,
    case when v_result = 'valid' then v_now else v_guest.checked_in_at end;
end;
$$;

revoke all on function scan_check_in(uuid, text, text) from public;
grant execute on function scan_check_in(uuid, text, text) to authenticated;
