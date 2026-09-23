-- Phase 4 revised (see DECISIONS.md, 2026-09-23): replaces Inngest with
-- pg_cron + pg_net. Two scheduled functions, because pg_net is
-- asynchronous — dispatch_send_jobs() fires the NextSMS request and gets
-- a request id back immediately; the actual response arrives later in
-- net._http_response, picked up by collect_send_responses() on its own
-- schedule.
--
-- send_jobs is a mechanical work queue only. The app (TypeScript) has
-- already resolved everything personalization-related — the guest's
-- phone number and the full rendered message text, including their
-- invite link — before inserting a row here, so this SQL never needs to
-- know about guests, events, i18n, or the site's URL. That keeps the
-- "smart" logic in one place (lib/i18n.ts, unit tested) and this file
-- purely "read a row, fire a request, read the response."
--
-- Auth: NextSMS uses Bearer token auth (`Authorization: Bearer <token>`),
-- the token found in their dashboard under Customer Info -> Customization
-- -> API Keys. (An earlier version of this file used `Basic <key>` based
-- on a public blog post that turned out to be wrong — NextSMS's real
-- Basic auth option requires base64(username:password) like standard
-- HTTP Basic auth, not a bare key. Bearer is what NextSMS's own docs
-- recommend and is what's implemented here.)
--
-- ---------------------------------------------------------------------
-- ONE-TIME MANUAL SETUP, not part of this migration (never put a real
-- API key in a file that gets committed to git):
--
--   select vault.create_secret('<your NextSMS API key>', 'nextsms_api_key');
--
-- Run that once in the SQL Editor after applying this migration, using
-- your real NEXTSMS_API_KEY value. To rotate it later, delete the old
-- secret from Project Settings -> Vault in the Supabase dashboard, then
-- run vault.create_secret again with the new value.
-- ---------------------------------------------------------------------

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- SEND_JOBS ------------------------------------------------------------

create table send_jobs (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references guests (id) on delete cascade,
  event_id uuid not null references events (id) on delete cascade,
  attempt_number int not null,
  to_phone text not null,
  message_text text not null,
  status text not null default 'pending' check (status in ('pending', 'requested', 'done')),
  net_request_id bigint,
  requested_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index send_jobs_pending_idx on send_jobs (next_attempt_at) where status = 'pending';
create index send_jobs_requested_idx on send_jobs (status) where status = 'requested';

-- No RLS policies at all: this table is never read or written by an
-- organiser's session or by anon — only by the service role (the app,
-- inserting a row) and by these SECURITY DEFINER functions (owned by
-- the migration-running role, which bypasses RLS on its own tables
-- regardless). Matches the same posture as delivery_events.
alter table send_jobs enable row level security;

-- DISPATCH_SEND_JOBS -----------------------------------------------------
-- Fires the NextSMS request for pending jobs. Does NOT wait for or
-- record the result — that happens in collect_send_responses() below,
-- once pg_net has actually gotten a response.

create or replace function dispatch_send_jobs() returns void
language plpgsql
security definer
set search_path = public, net, vault
as $$
declare
  job record;
  api_key text;
  req_id bigint;
begin
  select decrypted_secret into api_key
  from vault.decrypted_secrets
  where name = 'nextsms_api_key';

  if api_key is null then
    raise notice 'nextsms_api_key not set in Vault — skipping send_jobs dispatch. See the setup comment at the top of this migration.';
    return;
  end if;

  for job in
    select * from send_jobs
    where status = 'pending' and next_attempt_at <= now()
    order by created_at
    limit 20
    for update skip locked
  loop
    select net.http_post(
      url := 'https://messaging-service.co.tz/api/sms/v1/text/single',
      body := jsonb_build_object('from', 'ZUKA', 'to', job.to_phone, 'text', job.message_text),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || api_key
      ),
      timeout_milliseconds := 10000
    ) into req_id;

    update send_jobs
    set status = 'requested', net_request_id = req_id, requested_at = now()
    where id = job.id;
  end loop;
end;
$$;

-- COLLECT_SEND_RESPONSES -------------------------------------------------
-- Finalizes jobs whose pg_net response has arrived: logs a delivery_events
-- row (sent/failed), and for a retriable failure (network error, NextSMS
-- 5xx) queues one more attempt, up to 3 total — mirroring the retry
-- policy the old Inngest function had. A permanent failure (any 4xx,
-- e.g. an unapproved sender or a bad number) is logged once and left for
-- the organiser to retry manually from the delivery status page, same as
-- before. Also gives up on requests that never got a response at all
-- (pg_net dropped it, or fell outside its 6-hour response retention).

create or replace function collect_send_responses() returns void
language plpgsql
security definer
set search_path = public, net
as $$
declare
  job record;
  is_success boolean;
  is_retriable boolean;
  err_code text;
  err_message text;
  provider_msg_id text;
  max_attempts constant int := 3;
begin
  for job in
    select sj.*, r.status_code, r.content, r.timed_out, r.error_msg
    from send_jobs sj
    join net._http_response r on r.id = sj.net_request_id
    where sj.status = 'requested'
    for update of sj skip locked
  loop
    if job.timed_out or job.error_msg is not null then
      is_success := false;
      is_retriable := true;
      err_code := 'network_error';
      err_message := coalesce(job.error_msg, 'Request timed out.');
      provider_msg_id := null;
    elsif job.status_code between 200 and 299 then
      is_success := true;
      is_retriable := false;
      err_code := null;
      err_message := null;
      begin
        provider_msg_id := job.content::jsonb ->> 'messageId';
      exception when others then
        provider_msg_id := null;
      end;
    else
      is_success := false;
      is_retriable := job.status_code >= 500;
      err_code := job.status_code::text;
      begin
        err_message := coalesce(
          job.content::jsonb ->> 'message',
          job.content::jsonb ->> 'error',
          left(job.content, 500)
        );
      exception when others then
        err_message := left(coalesce(job.content, 'NextSMS returned HTTP ' || job.status_code), 500);
      end;
      provider_msg_id := null;
    end if;

    insert into delivery_events (
      guest_id, event_id, channel, provider, status, attempt_number,
      provider_message_id, error_code, error_message
    )
    values (
      job.guest_id, job.event_id, 'sms', 'nextsms',
      case when is_success then 'sent' else 'failed' end,
      job.attempt_number, provider_msg_id, err_code, err_message
    );

    if not is_success and is_retriable and job.attempt_number < max_attempts then
      insert into send_jobs (guest_id, event_id, attempt_number, to_phone, message_text, next_attempt_at)
      values (
        job.guest_id, job.event_id, job.attempt_number + 1, job.to_phone, job.message_text,
        now() + (interval '1 minute' * job.attempt_number)
      );
    end if;

    update send_jobs set status = 'done' where id = job.id;
  end loop;

  -- Requests stuck in 'requested' with no response at all after 10
  -- minutes: give up rather than leave them (and the guest's delivery
  -- status) stuck forever.
  for job in
    select * from send_jobs
    where status = 'requested' and requested_at < now() - interval '10 minutes'
    for update skip locked
  loop
    insert into delivery_events (guest_id, event_id, channel, provider, status, attempt_number, error_code, error_message)
    values (job.guest_id, job.event_id, 'sms', 'nextsms', 'failed', job.attempt_number, 'no_response', 'No response received from NextSMS within 10 minutes.');

    update send_jobs set status = 'done' where id = job.id;
  end loop;
end;
$$;

-- SCHEDULE ---------------------------------------------------------------
-- Every minute. Re-runnable: unschedules first if a job with this name
-- already exists, so re-applying this migration doesn't create
-- duplicate cron entries.

do $$
begin
  if exists (select 1 from cron.job where jobname = 'dispatch-send-jobs') then
    perform cron.unschedule('dispatch-send-jobs');
  end if;
  perform cron.schedule('dispatch-send-jobs', '* * * * *', 'select dispatch_send_jobs();');

  if exists (select 1 from cron.job where jobname = 'collect-send-responses') then
    perform cron.unschedule('collect-send-responses');
  end if;
  perform cron.schedule('collect-send-responses', '* * * * *', 'select collect_send_responses();');
end $$;
