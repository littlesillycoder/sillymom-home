import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TEST_CAPTCHA_TOKEN } from "./clients";
import { hasTestDb, skipReason, testDb } from "./supabase-test-env";

const options = { auth: { persistSession: false, autoRefreshToken: false } };

const title = "health_check 資料表的 Row Level Security";

describe.skipIf(!hasTestDb)(hasTestDb ? title : `${title}（${skipReason}）`, () => {
  let admin: SupabaseClient;
  let anon: SupabaseClient;
  let signedIn: SupabaseClient;
  let userId: string;

  beforeAll(async () => {
    admin = createClient(testDb.url!, testDb.secretKey!, options);
    anon = createClient(testDb.url!, testDb.publishableKey!, options);
    signedIn = createClient(testDb.url!, testDb.publishableKey!, options);

    const { error: upsertError } = await admin
      .from("health_check")
      .upsert({ id: 1, checked_at: new Date().toISOString() });
    expect(upsertError).toBeNull();

    const email = `rls-test-${Date.now()}@example.com`;
    const password = `pw-${crypto.randomUUID()}`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    expect(created.error).toBeNull();
    userId = created.data.user!.id;

    const signIn = await signedIn.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken: TEST_CAPTCHA_TOKEN },
    });
    expect(signIn.error).toBeNull();
  });

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("伺服器端（secret key）可以讀到資料", async () => {
    const { data, error } = await admin.from("health_check").select("id");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  for (const [who, client] of [
    ["未登入", () => anon],
    ["已登入", () => signedIn],
  ] as const) {
    it(`${who}的使用者讀不到資料`, async () => {
      const { data, error } = await client().from("health_check").select("id");
      // 沒有表格權限會回錯誤；就算沒有錯誤，也不能拿到任何一筆。
      expect(error !== null || (data ?? []).length === 0).toBe(true);
      expect(data ?? []).toHaveLength(0);
    });

    it(`${who}的使用者寫不進資料`, async () => {
      const { error } = await client()
        .from("health_check")
        .upsert({ id: 1, checked_at: "2000-01-01T00:00:00Z" });
      expect(error).not.toBeNull();

      const { data } = await admin.from("health_check").select("checked_at").eq("id", 1).single();
      expect(data?.checked_at).not.toBe("2000-01-01T00:00:00+00:00");
    });
  }
});
