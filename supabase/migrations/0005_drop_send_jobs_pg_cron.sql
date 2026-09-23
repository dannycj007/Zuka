-- Reverts 0004_send_jobs_pg_cron.sql (see DECISIONS.md, 2026-09-23 —
-- "5.1 revised again"). Live debugging surfaced real friction with the
-- pg_net-based approach itself: asynchronous (needed a dispatch/collect
-- split plus this queue table), SQL/plpgsql business logic with no unit
-- test story, thin pg_net documentation. Moved to a direct, synchronous
-- call from the Next.js server action instead (lib/delivery/nextsms.ts).
--
-- Leaves the pg_net and pg_cron extensions themselves enabled — harmless
-- unused, and dropping an extension risks affecting anything else that
-- might depend on it — but removes everything else 0004 added.

do $$
begin
  if exists (select 1 from cron.job where jobname = 'dispatch-send-jobs') then
    perform cron.unschedule('dispatch-send-jobs');
  end if;
  if exists (select 1 from cron.job where jobname = 'collect-send-responses') then
    perform cron.unschedule('collect-send-responses');
  end if;
end $$;

drop function if exists dispatch_send_jobs();
drop function if exists collect_send_responses();
drop table if exists send_jobs;

-- The Vault secret (nextsms_api_key) is left in place — harmless if
-- unused, and there's no harm keeping it in case pg_net is reused later.
-- The app now reads NEXTSMS_API_KEY from its own environment instead
-- (Vercel / .env), same as any other credential in this project.
