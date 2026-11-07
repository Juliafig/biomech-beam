// Copies all lab data from the old Supabase project (Lovable Cloud) into a new one.
//
// Usage (from the project folder, after `npm install`):
//
//   NEW_SUPABASE_URL="https://xxxx.supabase.co" \
//   NEW_SUPABASE_SECRET_KEY="sb_secret_..." \
//   node scripts/migrar-datos.mjs
//
// The old project (Lovable Cloud) is built in below; override it with
// OLD_SUPABASE_URL / OLD_SUPABASE_KEY if needed. Its key is the public one.
//
// WARNING: the new project's lab tables are emptied first (including the sample
// data created by the migrations) and replaced with the old data.

import { createClient } from "@supabase/supabase-js";

const OLD_URL = process.env.OLD_SUPABASE_URL ?? "https://uiwttjqghpahxaacppbc.supabase.co";
const OLD_KEY = process.env.OLD_SUPABASE_KEY ?? "sb_publishable_GFH1htdHXCgHUhgMXW9E9Q_psu9jh48";
const NEW_URL = process.env.NEW_SUPABASE_URL;
const NEW_KEY = process.env.NEW_SUPABASE_SECRET_KEY;

if (!OLD_URL || !OLD_KEY || !NEW_URL || !NEW_KEY) {
  console.error("Missing settings. Need NEW_SUPABASE_URL and NEW_SUPABASE_SECRET_KEY.");
  process.exit(1);
}
if (OLD_URL === NEW_URL) {
  console.error("Old and new URL are the same.");
  process.exit(1);
}

// New-style keys (sb_publishable_/sb_secret_) go in the apikey header only, not as a Bearer token.
const keyFetch = (key) => (input, init) => {
  const headers = new Headers(init?.headers);
  if (/^sb_(publishable|secret)_/.test(key) && headers.get("Authorization") === `Bearer ${key}`) {
    headers.delete("Authorization");
  }
  headers.set("apikey", key);
  return fetch(input, { ...init, headers });
};
const client = (url, key) =>
  createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: keyFetch(key) },
  });
const oldDb = client(OLD_URL, OLD_KEY);
const newDb = client(NEW_URL, NEW_KEY);

// Parent tables first so foreign keys line up (ids are preserved).
const TABLES = ["machines", "customers", "employees", "holidays", "projects", "project_steps"];

async function readAll(table) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await oldDb
      .from(table)
      .select("*")
      .range(from, from + 999);
    if (error) throw new Error(`Reading ${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

const data = {};
for (const table of TABLES) {
  data[table] = await readAll(table);
  console.log(`read   ${table.padEnd(14)} ${data[table].length} rows`);
}

for (const table of [...TABLES].reverse()) {
  const { error } = await newDb.from(table).delete().not("id", "is", null);
  if (error) throw new Error(`Emptying ${table}: ${error.message}`);
}

for (const table of TABLES) {
  const rows = data[table];
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await newDb.from(table).insert(rows.slice(i, i + 500));
    if (error) throw new Error(`Writing ${table}: ${error.message}`);
  }
  console.log(`copied ${table.padEnd(14)} ${rows.length} rows`);
}

console.log("Done. Assistant chat history is not copied (it is now private per user).");
