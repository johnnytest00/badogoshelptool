/* global console, process */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createClient } from "@supabase/supabase-js";

const config = readFileSync("supabase/config.toml", "utf8");
if (!config.includes('project_id = "badogos-helptool"')) throw new Error("Nem a várt helyi Supabase projekt.");

const statusOutput = execFileSync("supabase", ["status", "--output", "env"], { encoding: "utf8" });
const values = Object.fromEntries(statusOutput.split("\n").flatMap((line) => {
  const match = line.match(/^(?:export )?([A-Z0-9_]+)=(.*)$/);
  return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, "")]] : [];
}));
const url = values.API_URL;
const publishableKey = values.PUBLISHABLE_KEY;
const serviceRoleKey = values.SERVICE_ROLE_KEY;
if (!url?.startsWith("http://127.0.0.1:") || !publishableKey || !serviceRoleKey) throw new Error("A Supabase CLI nem helyi vagy hiányos státuszt adott vissza.");

writeFileSync(".env.local", `NEXT_PUBLIC_SUPABASE_URL=${url}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${publishableKey}\n`);
console.log(".env.local létrehozva kizárólag a helyi Supabase URL-lel és publishable kulccsal.");

if (process.argv.includes("--env-only")) process.exit(0);

const readline = createInterface({ input, output });
const email = process.env.LOCAL_AUTH_EMAIL ?? "local.owner@local.test";
const password = process.env.LOCAL_AUTH_PASSWORD ?? await readline.question(`Helyi jelszó (${email}): `);
readline.close();
if (password.length < 6) throw new Error("A helyi tesztjelszónak legalább 6 karakteresnek kell lennie.");

const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const seededOwnerId = "00000000-0000-4000-8000-000000000001";
let user = null;
if (email.toLowerCase() === "demo.owner@local.test") {
  const seededUser = await admin.auth.admin.updateUserById(seededOwnerId, { password, email_confirm: true });
  if (!seededUser.error) user = seededUser.data.user;
}
if (!user) {
  const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) throw usersError;
  user = usersData.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase()) ?? null;
}
if (user && email.toLowerCase() === "demo.owner@local.test") {
  // The seeded local owner has already received the requested password above.
} else if (user) {
  const result = await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  if (result.error) throw result.error;
  user = result.data.user;
} else {
  const result = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (result.error) throw result.error;
  user = result.data.user;
}

const { data: organization, error: organizationError } = await admin.from("organizations").select("id").eq("name", "DEMO TetőPro Kft.").single();
if (organizationError || !organization) throw organizationError ?? new Error("A DEMO szervezet nem található.");
const { error: membershipError } = await admin.from("organization_members").upsert({ organization_id: organization.id, user_id: user.id, role: "owner" }, { onConflict: "organization_id,user_id" });
if (membershipError) throw membershipError;
console.log(`Helyi Auth tesztfelhasználó és DEMO owner tagság kész: ${email}`);
