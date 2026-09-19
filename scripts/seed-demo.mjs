#!/usr/bin/env node
// Seeds a demo event with 20 fake Tanzanian guests for Phase 1's
// "done when" check: sign up in the app, run this script, see the demo
// event on your dashboard.
//
// Usage: npm run seed:demo -- you@example.com
//   (or set SEED_ORG_OWNER_EMAIL in .env instead of passing an argument)
//
// Plain JS (not TS) on purpose: this is a standalone Node script, not part
// of the Next.js build, and this way it needs no TS-runner dependency
// (tsx/ts-node) just to seed some demo rows.

import { existsSync } from "node:fs";
import { randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
} else if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ownerEmail = process.env.SEED_ORG_OWNER_EMAIL || process.argv[2];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Copy .env.example to .env and fill in your Supabase project's values.",
  );
  process.exit(1);
}

if (!ownerEmail) {
  console.error(
    "No organiser email given.\n" +
      "Usage: npm run seed:demo -- you@example.com\n" +
      "(or set SEED_ORG_OWNER_EMAIL in .env)\n\n" +
      "This must be the email you already signed up with in the app —\n" +
      "the demo event is attached to that account's organisation.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BASE62_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function generateInviteToken() {
  let token = "";
  for (let i = 0; i < 22; i++) {
    token += BASE62_ALPHABET[randomInt(BASE62_ALPHABET.length)];
  }
  return token;
}

async function findUserByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  });
  if (error) throw error;
  const user = data.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (!user) {
    throw new Error(
      `No signed-up user found with email ${email}. Sign up in the app first, then re-run this script.`,
    );
  }
  return user;
}

const GUESTS = [
  { name: "Amina Juma", category: "VIP", table: "Table 1" },
  { name: "Baraka Mushi", category: "family", table: "Table 1" },
  { name: "Chausiku Mwakalinga", category: "family", table: "Table 2" },
  { name: "Daudi Kessy", category: "general", table: "Table 3" },
  { name: "Esther Mollel", category: "family", table: "Table 2" },
  { name: "Fatuma Ali", category: "VIP", table: "Table 1" },
  { name: "Godfrey Lyimo", category: "general", table: "Table 4" },
  { name: "Halima Said", category: "family", table: "Table 2" },
  { name: "Ibrahim Nyerere", category: "general", table: "Table 3" },
  { name: "Joyce Kimaro", category: "family", table: "Table 2" },
  { name: "Khalfan Rashid", category: "general", table: "Table 4" },
  { name: "Leah Massawe", category: "VIP", table: "Table 1" },
  { name: "Mwajuma Hassan", category: "family", table: "Table 5" },
  { name: "Neema Shirima", category: "general", table: "Table 3" },
  { name: "Omari Suleiman", category: "general", table: "Table 4" },
  { name: "Pendo Mrema", category: "family", table: "Table 5" },
  { name: "Rehema Mwanga", category: "general", table: "Table 3" },
  { name: "Salum Kombo", category: "general", table: "Table 4" },
  { name: "Tumaini Mbwana", category: "family", table: "Table 5" },
  { name: "Zawadi Chuma", category: "VIP", table: "Table 1" },
];

function fakeTanzanianPhone(index) {
  // +255 7XX/6XX XXX XXX — the real Tanzanian mobile prefix ranges.
  // Deterministic per index so re-running the script is reproducible.
  const prefixes = ["71", "75", "76", "78", "65", "68"];
  const prefix = prefixes[index % prefixes.length];
  const rest = String(100000 + ((index * 7919) % 900000)).padStart(6, "0");
  return `+255${prefix}${rest}`;
}

async function main() {
  const owner = await findUserByEmail(ownerEmail);
  console.log(`Seeding demo data for ${owner.email} (${owner.id})`);

  let { data: org } = await supabase
    .from("organisations")
    .select("id, name")
    .eq("owner_user_id", owner.id)
    .maybeSingle();

  if (!org) {
    const { data: newOrg, error } = await supabase
      .from("organisations")
      .insert({ name: "Demo Organisation", owner_user_id: owner.id })
      .select("id, name")
      .single();
    if (error) throw error;
    org = newOrg;
    console.log(`Created organisation "${org.name}"`);
  } else {
    console.log(`Using existing organisation "${org.name}"`);
  }

  let { data: theme } = await supabase
    .from("themes")
    .select("id")
    .eq("name", "Classic")
    .maybeSingle();

  if (!theme) {
    const { data: newTheme, error } = await supabase
      .from("themes")
      .insert({ name: "Classic", config: {} })
      .select("id")
      .single();
    if (error) throw error;
    theme = newTheme;
    console.log('Created placeholder "Classic" theme');
  }

  const startsAt = new Date();
  startsAt.setDate(startsAt.getDate() + 30);
  startsAt.setHours(16, 0, 0, 0);

  const { data: event, error: eventError } = await supabase
    .from("events")
    .insert({
      org_id: org.id,
      name: "Amina & Baraka's Wedding",
      event_type: "wedding",
      starts_at: startsAt.toISOString(),
      timezone: "Africa/Dar_es_Salaam",
      venue_name: "Ledger Plaza Garden",
      venue_address: "Kivukoni Front, Dar es Salaam",
      venue_lat: -6.8161,
      venue_lng: 39.2925,
      theme_id: theme.id,
      language: "sw",
      status: "draft",
    })
    .select("id, name")
    .single();

  if (eventError) throw eventError;
  console.log(`Created event "${event.name}" (${event.id})`);

  const guestRows = GUESTS.map((guest, index) => ({
    event_id: event.id,
    full_name: guest.name,
    phone_e164: fakeTanzanianPhone(index),
    category: guest.category,
    table_label: guest.table,
    invite_token: generateInviteToken(),
  }));

  const { error: guestsError } = await supabase
    .from("guests")
    .insert(guestRows);
  if (guestsError) throw guestsError;

  console.log(`Seeded ${guestRows.length} guests.`);
  console.log("Done. Log in and open the dashboard to see the demo event.");
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
