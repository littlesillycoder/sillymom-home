import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { TEST_CAPTCHA_TOKEN } from "../db/clients";
import { hasTestDb, skipReason, testDb } from "../db/supabase-test-env";

/**
 * #11（從 #6 移過來）：Supabase Auth 的次數限制實測（supabase/config.toml）。
 * 這些測試會用掉同一個 IP 的次數，所以和其他資料庫測試分開、最後才跑（.github/workflows/ci.yml）。
 * 用測試手機號碼（不會真的發簡訊）。
 */
const title = "Supabase Auth 次數限制（資料庫）";
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const newClient = () => createClient(testDb.url!, testDb.publishableKey!, options);

describe.skipIf(!hasTestDb)(hasTestDb ? title : `${title}（${skipReason}）`, () => {
  const admin = hasTestDb ? createClient(testDb.url!, testDb.secretKey!, options) : null;

  afterAll(async () => {
    const { data } = (await admin?.auth.admin.listUsers({ perPage: 200 })) ?? { data: null };
    for (const u of data?.users ?? []) {
      if (u.phone?.startsWith("88690000000")) await admin!.auth.admin.deleteUser(u.id);
    }
  });

  it("同一支手機 60 秒內第二次送驗證碼會被擋下（max_frequency）", async () => {
    const phone = "+886900000003";
    const first = await newClient().auth.signInWithOtp({
      phone,
      options: { captchaToken: TEST_CAPTCHA_TOKEN },
    });
    expect(first.error).toBeNull();
    const second = await newClient().auth.signInWithOtp({
      phone,
      options: { captchaToken: TEST_CAPTCHA_TOKEN },
    });
    expect(second.error, "第二次應該被擋下").not.toBeNull();
    expect(second.error?.status).toBe(429);
  });

  it("同一個 IP 驗證錯誤超過上限會被擋下（token_verifications：5 分鐘 30 次）", async () => {
    const phone = "+886900000004";
    const sent = await newClient().auth.signInWithOtp({
      phone,
      options: { captchaToken: TEST_CAPTCHA_TOKEN },
    });
    expect(sent.error).toBeNull();
    const statuses: (number | undefined)[] = [];
    for (let i = 0; i < 35; i++) {
      const { error } = await newClient().auth.verifyOtp({ phone, token: "000000", type: "sms" });
      statuses.push(error?.status);
      if (error?.status === 429) break;
    }
    expect(statuses, "35 次以內應該出現 429").toContain(429);
  });
});
