import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect } from "vitest";
import { testDb } from "./supabase-test-env";

const options = { auth: { persistSession: false, autoRefreshToken: false } };

/** 測試資料庫開啟了 Turnstile（supabase/config.toml），登入要帶 Cloudflare 測試密鑰對應的測試 token */
export const TEST_CAPTCHA_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";

export type TestClients = {
  /** secret key：伺服器端 */
  admin: SupabaseClient;
  /** publishable key、未登入 */
  anon: SupabaseClient;
  /** publishable key、已登入的一般使用者 */
  signedIn: SupabaseClient;
  cleanup: () => Promise<void>;
};

export async function createTestClients(): Promise<TestClients> {
  const admin = createClient(testDb.url!, testDb.secretKey!, options);
  const anon = createClient(testDb.url!, testDb.publishableKey!, options);
  const signedIn = createClient(testDb.url!, testDb.publishableKey!, options);

  const email = `rls-test-${crypto.randomUUID()}@example.com`;
  const password = `pw-${crypto.randomUUID()}`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  expect(created.error).toBeNull();
  const signIn = await signedIn.auth.signInWithPassword({
    email,
    password,
    options: { captchaToken: TEST_CAPTCHA_TOKEN },
  });
  expect(signIn.error).toBeNull();

  return {
    admin,
    anon,
    signedIn,
    cleanup: async () => {
      await admin.auth.admin.deleteUser(created.data.user!.id);
    },
  };
}

export type TestUser = { id: string; client: SupabaseClient };

/** 建立一個已登入的測試使用者（資料庫會自動建立客戶資料和客戶角色）。刪除用 admin.auth.admin.deleteUser(id)。 */
export async function createSignedInUser(admin: SupabaseClient, label: string): Promise<TestUser> {
  const client = createClient(testDb.url!, testDb.publishableKey!, options);
  const email = `${label}-${crypto.randomUUID()}@example.com`;
  const password = `pw-${crypto.randomUUID()}`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  expect(created.error).toBeNull();
  const signIn = await client.auth.signInWithPassword({
    email,
    password,
    options: { captchaToken: TEST_CAPTCHA_TOKEN },
  });
  expect(signIn.error).toBeNull();
  return { id: created.data.user!.id, client };
}
