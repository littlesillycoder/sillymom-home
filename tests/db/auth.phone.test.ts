import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TEST_CAPTCHA_TOKEN } from "./clients";
import { hasTestDb, skipReason, testDb } from "./supabase-test-env";

/**
 * #11 手機驗證碼登入（GitHub 的暫時資料庫，supabase/config.toml 的測試手機號碼，驗證碼固定 123456）。
 * 次數限制的實測在 tests/db-limits/（會用掉同一個 IP 的次數，另外跑）。
 */
const title = "手機驗證碼登入與條款紀錄（資料庫）";
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const PHONE_LOGIN = "+886900000001";
const PHONE_TERMS = "+886900000002";
/** 另一位使用者（每支號碼 60 秒內只能送一次驗證碼，所以不重複用） */
const PHONE_OTHER = "+886900000005";

async function phoneLogin(phone: string) {
  const client = createClient(testDb.url!, testDb.publishableKey!, options);
  const sent = await client.auth.signInWithOtp({
    phone,
    options: { captchaToken: TEST_CAPTCHA_TOKEN, channel: "sms" },
  });
  expect(sent.error).toBeNull();
  const verified = await client.auth.verifyOtp({ phone, token: "123456", type: "sms" });
  expect(verified.error).toBeNull();
  return { client, userId: verified.data.user!.id };
}

describe.skipIf(!hasTestDb)(hasTestDb ? title : `${title}（${skipReason}）`, () => {
  let admin: SupabaseClient;
  const created: string[] = [];

  beforeAll(() => {
    admin = createClient(testDb.url!, testDb.secretKey!, options);
  });
  afterAll(async () => {
    for (const id of created) await admin.auth.admin.deleteUser(id);
  });

  it("測試手機號碼用 123456 可以登入；新帳號自動有客戶資料和客戶角色", async () => {
    const { client, userId } = await phoneLogin(PHONE_LOGIN);
    created.push(userId);
    const customer = await client.from("customers").select("display_name, locale").single();
    expect(customer.data).toEqual({ display_name: "", locale: "zh-TW" });
    const roles = await client.from("user_roles").select("role");
    expect(roles.data).toEqual([{ role: "customer" }]);
  });

  it("沒有通過 Turnstile（沒帶 captchaToken）不能送驗證碼", async () => {
    const client = createClient(testDb.url!, testDb.publishableKey!, options);
    const { error } = await client.auth.signInWithOtp({ phone: PHONE_LOGIN });
    expect(error?.message ?? "").toMatch(/captcha/i);
  });

  it("驗證碼錯誤不能登入", async () => {
    const client = createClient(testDb.url!, testDb.publishableKey!, options);
    const { error } = await client.auth.verifyOtp({
      phone: PHONE_LOGIN,
      token: "000000",
      type: "sms",
    });
    expect(error).not.toBeNull();
  });

  describe("條款紀錄", () => {
    let client: SupabaseClient;
    let userId: string;
    let version: string;

    beforeAll(async () => {
      ({ client, userId } = await phoneLogin(PHONE_TERMS));
      created.push(userId);
      const v = await client.rpc("current_terms_version");
      expect(v.error).toBeNull();
      version = v.data as string;
    });

    it("目前的條款版本是平台設定的值", () => {
      expect(version).toBe("2026-11-draft");
    });

    it("可以新增自己、目前版本的同意紀錄，也讀得到", async () => {
      const insert = await client.from("terms_acceptances").insert([
        { document: "terms", version },
        { document: "privacy", version },
      ]);
      expect(insert.error).toBeNull();
      const read = await client.from("terms_acceptances").select("document, version, user_id");
      expect(read.data).toHaveLength(2);
      expect(read.data!.every((r) => r.user_id === userId && r.version === version)).toBe(true);
    });

    it("不能新增別的版本", async () => {
      const { error } = await client
        .from("terms_acceptances")
        .insert({ document: "terms", version: "2099-01-final" });
      expect(error).not.toBeNull();
    });

    it("不能替別人新增（不能指定使用者）", async () => {
      const { error } = await client.from("terms_acceptances").insert({
        user_id: "3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b",
        document: "terms",
        version,
      });
      expect(error).not.toBeNull();
    });

    it("不能修改、刪除同意紀錄", async () => {
      expect(
        (
          await client
            .from("terms_acceptances")
            .update({ version: "2026-01-old" })
            .eq("user_id", userId)
        ).error,
      ).not.toBeNull();
      expect(
        (await client.from("terms_acceptances").delete().eq("user_id", userId)).error,
      ).not.toBeNull();
      const still = await admin.from("terms_acceptances").select("id").eq("user_id", userId);
      expect(still.data).toHaveLength(2);
    });

    it("讀不到別人的同意紀錄；未登入讀不到", async () => {
      const other = await phoneLogin(PHONE_OTHER);
      created.push(other.userId);
      const read = await other.client.from("terms_acceptances").select("id").eq("user_id", userId);
      expect(read.data).toEqual([]);
      const anon = createClient(testDb.url!, testDb.publishableKey!, options);
      expect((await anon.from("terms_acceptances").select("id")).error).not.toBeNull();
    });

    it("未登入不能讀條款版本函式", async () => {
      const anon = createClient(testDb.url!, testDb.publishableKey!, options);
      expect((await anon.rpc("current_terms_version")).error).not.toBeNull();
    });
  });
});
