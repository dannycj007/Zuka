-- Demo seed, SQL Editor version.
--
-- Does the same thing as `npm run seed:demo -- <email>`: finds (or creates)
-- the organisation owned by the given signed-up user, ensures a placeholder
-- "Classic" theme exists, then creates one demo wedding event with 20
-- Tanzanian guests attached to that organisation.
--
-- Exists because scripts/seed-demo.mjs needs outbound network access to
-- your Supabase project, which isn't available from every environment this
-- gets run from. Safe to run more than once — reruns reuse the existing
-- org/theme but do add a new event + guest set each time.
--
-- Edit the email on the next line, then run this whole file in the
-- Supabase SQL Editor.

do $$
declare
  v_owner_email text := 'dannyvoncharles007@gmail.com';
  v_owner_id uuid;
  v_org_id uuid;
  v_theme_id uuid;
  v_event_id uuid;
begin
  select id into v_owner_id from auth.users where email = v_owner_email;
  if v_owner_id is null then
    raise exception 'No signed-up user found with email %. Sign up in the app first, then re-run this.', v_owner_email;
  end if;

  select id into v_org_id from organisations where owner_user_id = v_owner_id limit 1;
  if v_org_id is null then
    insert into organisations (name, owner_user_id)
    values ('Demo Organisation', v_owner_id)
    returning id into v_org_id;
  end if;

  -- "Garden" is one of the 5 fixed themes seeded by migration
  -- 0003_public_invite_access.sql — this script doesn't create themes
  -- itself, it just picks one for the demo event.
  select id into v_theme_id from themes where name = 'Garden' limit 1;
  if v_theme_id is null then
    raise exception 'No "Garden" theme found. Apply 0003_public_invite_access.sql first.';
  end if;

  insert into events (
    org_id, name, event_type, starts_at, timezone,
    venue_name, venue_address, venue_lat, venue_lng,
    theme_id, language, status
  )
  values (
    v_org_id, 'Amina & Baraka''s Wedding', 'wedding', now() + interval '30 days', 'Africa/Dar_es_Salaam',
    'Ledger Plaza Garden', 'Kivukoni Front, Dar es Salaam', -6.8161, 39.2925,
    v_theme_id, 'sw', 'draft'
  )
  returning id into v_event_id;

  -- Phone numbers: +255 + a real Tanzanian mobile network prefix (Tigo
  -- 754/755/756, Airtel 786/787, Vodacom 715, Halotel 658, Airtel 683,
  -- Halotel 621) + a 6-digit subscriber number = 9 digits after +255,
  -- matching scripts/seed-demo.mjs's fakeTanzanianPhone().
  --
  -- Invite tokens: 16 random bytes -> 32 hex chars = 128 bits of entropy,
  -- the same minimum as the app's base62 generator, just a different
  -- (also URL-safe) alphabet.
  insert into guests (event_id, full_name, phone_e164, category, table_label, invite_token)
  values
    (v_event_id, 'Amina Juma',           '+255754100000', 'VIP',     'Table 1', encode(gen_random_bytes(16), 'hex')),
    (v_event_id, 'Baraka Mushi',         '+255786107919', 'family',  'Table 1', encode(gen_random_bytes(16), 'hex')),
    (v_event_id, 'Chausiku Mwakalinga',  '+255715115838', 'family',  'Table 2', encode(gen_random_bytes(16), 'hex')),
    (v_event_id, 'Daudi Kessy',          '+255658123757', 'general', 'Table 3', encode(gen_random_bytes(16), 'hex')),
    (v_event_id, 'Esther Mollel',        '+255683131676', 'family',  'Table 2', encode(gen_random_bytes(16), 'hex')),
    (v_event_id, 'Fatuma Ali',           '+255621139595', 'VIP',     'Table 1', encode(gen_random_bytes(16), 'hex')),
    (v_event_id, 'Godfrey Lyimo',        '+255754147514', 'general', 'Table 4', encode(gen_random_bytes(16), 'hex')),
    (v_event_id, 'Halima Said',          '+255786155433', 'family',  'Table 2', encode(gen_random_bytes(16), 'hex')),
    (v_event_id, 'Ibrahim Nyerere',      '+255715163352', 'general', 'Table 3', encode(gen_random_bytes(16), 'hex')),
    (v_event_id, 'Joyce Kimaro',         '+255658171271', 'family',  'Table 2', encode(gen_random_bytes(16), 'hex')),
    (v_event_id, 'Khalfan Rashid',       '+255683179190', 'general', 'Table 4', encode(gen_random_bytes(16), 'hex')),
    (v_event_id, 'Leah Massawe',         '+255621187109', 'VIP',     'Table 1', encode(gen_random_bytes(16), 'hex')),
    (v_event_id, 'Mwajuma Hassan',       '+255754195028', 'family',  'Table 5', encode(gen_random_bytes(16), 'hex')),
    (v_event_id, 'Neema Shirima',        '+255786202947', 'general', 'Table 3', encode(gen_random_bytes(16), 'hex')),
    (v_event_id, 'Omari Suleiman',       '+255715210866', 'general', 'Table 4', encode(gen_random_bytes(16), 'hex')),
    (v_event_id, 'Pendo Mrema',          '+255658218785', 'family',  'Table 5', encode(gen_random_bytes(16), 'hex')),
    (v_event_id, 'Rehema Mwanga',        '+255683226704', 'general', 'Table 3', encode(gen_random_bytes(16), 'hex')),
    (v_event_id, 'Salum Kombo',          '+255621234623', 'general', 'Table 4', encode(gen_random_bytes(16), 'hex')),
    (v_event_id, 'Tumaini Mbwana',       '+255754242542', 'family',  'Table 5', encode(gen_random_bytes(16), 'hex')),
    (v_event_id, 'Zawadi Chuma',         '+255786250461', 'VIP',     'Table 1', encode(gen_random_bytes(16), 'hex'));

  raise notice 'Seeded event % for org % (owner %) with 20 guests.', v_event_id, v_org_id, v_owner_id;
end $$;
