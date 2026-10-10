-- Decision 5.1's 2026-10-10 provider swap (see DECISIONS.md): NextSMS is
-- replaced by HudumaSMS. Adds 'hudumasms' to the allowed provider
-- values on delivery_events. Keeps 'nextsms' in the list too — it's
-- never written by the app again, but historical delivery_events rows
-- from before this swap already have provider = 'nextsms', and a CHECK
-- constraint validates every existing row when replaced, so dropping it
-- here would break the migration on any project with real send history.

alter table delivery_events drop constraint delivery_events_provider_check;
alter table delivery_events add constraint delivery_events_provider_check
  check (provider in ('nextsms', 'hudumasms', 'whatsapp'));
