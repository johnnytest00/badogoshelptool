/* global process */

import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/infrastructure/supabase/database.types";

const runLocal = process.env.RUN_LOCAL_AUTH_ACCOUNT_TESTS === "1";
const password = `Local-${randomUUID()}-Aa1`;
const changedPassword = `Updated-${randomUUID()}-Bb2`;
const email = (label: string) => `f9149-${label}-${randomUUID()}@local.test`;
let admin: SupabaseClient<Database> | undefined;
let accountClient: SupabaseClient<Database> | undefined;
let otherClient: SupabaseClient<Database> | undefined;
let accountUser: User | undefined;
let otherUser: User | undefined;
let accountEmail = "";
let otherEmail = "";

function localStatus() {
  const output = execFileSync("supabase", ["status", "--output", "env"], { encoding: "utf8" });
  const values = Object.fromEntries(output.split("\n").flatMap((line) => {
    const match = line.match(/^(?:export )?([A-Z0-9_]+)=(.*)$/);
    return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, "")]] : [];
  }));
  if (!values.API_URL?.startsWith("http://127.0.0.1:") || !values.PUBLISHABLE_KEY || !values.SERVICE_ROLE_KEY) throw new Error("A fiókteszt kizárólag helyi Supabase példányon futhat.");
  return { url: values.API_URL, publishableKey: values.PUBLISHABLE_KEY, serviceRoleKey: values.SERVICE_ROLE_KEY };
}

const localDescribe = runLocal ? describe : describe.skip;

localDescribe("F9.14.9 local Supabase Auth self-service", () => {
  beforeAll(async () => {
    const status = localStatus();
    admin = createSupabaseClient<Database>(status.url, status.serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    accountEmail = email("account"); otherEmail = email("other");
    const [created, otherCreated] = await Promise.all([
      admin.auth.admin.createUser({ email: accountEmail, password, email_confirm: true, user_metadata: { fixture: "DEMO F9.14.9" } }),
      admin.auth.admin.createUser({ email: otherEmail, password, email_confirm: true, user_metadata: { fixture: "DEMO F9.14.9" } }),
    ]);
    accountUser = created.data.user ?? undefined; otherUser = otherCreated.data.user ?? undefined;
    if (created.error || otherCreated.error || !accountUser || !otherUser) throw created.error ?? otherCreated.error ?? new Error("A lokális tesztfiókok létrehozása sikertelen.");
    accountClient = createSupabaseClient<Database>(status.url, status.publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
    otherClient = createSupabaseClient<Database>(status.url, status.publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const [accountSignIn, otherSignIn] = await Promise.all([
      accountClient.auth.signInWithPassword({ email: accountEmail, password }),
      otherClient.auth.signInWithPassword({ email: otherEmail, password }),
    ]);
    if (accountSignIn.error || otherSignIn.error) throw accountSignIn.error ?? otherSignIn.error;
  });

  afterAll(async () => {
    await Promise.all([accountClient?.auth.signOut(), otherClient?.auth.signOut()]);
    if (admin && accountUser) await admin.auth.admin.deleteUser(accountUser.id);
    if (admin && otherUser) await admin.auth.admin.deleteUser(otherUser.id);
  });

  it("updates only the signed-in user's password and accepts their own email change request", async () => {
    if (!accountClient || !otherClient) throw new Error("A lokális tesztkliensek nem inicializálódtak.");
    const passwordUpdate = await accountClient.auth.updateUser({ password: changedPassword });
    expect(passwordUpdate.error).toBeNull();
    const newPasswordClient = createSupabaseClient(localStatus().url, localStatus().publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const oldPasswordSignIn = await newPasswordClient.auth.signInWithPassword({ email: accountEmail, password });
    expect(oldPasswordSignIn.error).not.toBeNull();
    const newPasswordSignIn = await newPasswordClient.auth.signInWithPassword({ email: accountEmail, password: changedPassword });
    expect(newPasswordSignIn.error).toBeNull();

    const changedEmail = email("updated");
    const emailUpdate = await accountClient.auth.updateUser({ email: changedEmail });
    expect(emailUpdate.error).toBeNull();
    expect(emailUpdate.data.user?.email === changedEmail || emailUpdate.data.user?.new_email === changedEmail).toBe(true);

    const otherSignIn = await otherClient.auth.getUser();
    expect(otherSignIn.data.user?.id).toBe(otherUser?.id);
    expect(otherSignIn.data.user?.email).toBe(otherEmail);
    await newPasswordClient.auth.signOut();
  });
});
