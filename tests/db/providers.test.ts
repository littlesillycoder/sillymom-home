import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { money } from "@/shared/i18n/money";
import { SupabaseProviderLogStore } from "@/shared/providers/log/supabase-store";
import { createMockPayment } from "@/shared/providers/payment/impl/mock";
import { createMockSms } from "@/shared/providers/sms/impl/mock";
import { createTestClients, type TestClients } from "./clients";
import { hasTestDb, skipReason } from "./supabase-test-env";

const title = "外部服務紀錄與平台設定（資料庫）";
const CASE = "3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b";

describe.skipIf(!hasTestDb)(hasTestDb ? title : `${title}（${skipReason}）`, () => {
  let c: TestClients;
  let store: SupabaseProviderLogStore;

  beforeAll(async () => {
    c = await createTestClients();
    store = new SupabaseProviderLogStore(c.admin);
  });
  afterAll(async () => {
    await c?.admin.from("provider_logs").delete().like("idempotency_key", "dbtest-%");
    await c?.cleanup();
  });

  for (const who of ["未登入", "已登入"] as const) {
    const client = (): SupabaseClient => (who === "未登入" ? c.anon : c.signedIn);
    for (const table of ["provider_logs", "platform_settings"]) {
      it(`${who}的使用者讀不到 ${table}`, async () => {
        const { data } = await client().from(table).select("*");
        expect(data ?? []).toHaveLength(0);
      });
    }
    it(`${who}的使用者寫不進 provider_logs、改不了 platform_settings、不能呼叫刪除函式`, async () => {
      const insert = await client().from("provider_logs").insert({
        service: "payment",
        implementation: "mock",
        action: "charge",
        status: "success",
      });
      expect(insert.error).not.toBeNull();
      await client()
        .from("platform_settings")
        .update({ int_value: 1 })
        .eq("key", "provider_logs_retention_days");
      const { data } = await c.admin
        .from("platform_settings")
        .select("int_value")
        .eq("key", "provider_logs_retention_days")
        .single();
      expect(data?.int_value).toBe(90);
      const rpc = await client().rpc("purge_provider_logs");
      expect(rpc.error).not.toBeNull();
    });
  }

  it("平台設定的保存天數預設 90", async () => {
    const { data } = await c.admin
      .from("platform_settings")
      .select("int_value")
      .eq("key", "provider_logs_retention_days")
      .single();
    expect(data?.int_value).toBe(90);
  });

  it("扣款：同一個編號兩次只扣一次（資料庫唯一限制）", async () => {
    const pay = createMockPayment(store);
    const input = {
      idempotencyKey: `dbtest-charge-${Date.now()}`,
      cardToken: "mock_card_x",
      amount: money("150.00", "TWD"),
      orderRef: CASE,
    };
    const a = await pay.charge(input);
    const b = await pay.charge(input);
    expect(b.transactionId).toBe(a.transactionId);
    const { data } = await c.admin
      .from("provider_logs")
      .select("id, amount, currency, external_id, result_code")
      .eq("idempotency_key", input.idempotencyKey);
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({
      currency: "TWD",
      external_id: a.transactionId,
      result_code: "OK",
    });
    expect(Number(data![0].amount)).toBe(150);

    // 直接再寫一筆同編號也會被資料庫擋下
    const dup = await c.admin.from("provider_logs").insert({
      service: "payment",
      implementation: "mock",
      action: "charge",
      status: "success",
      idempotency_key: input.idempotencyKey,
    });
    expect(dup.error).not.toBeNull();
  });

  it("簡訊紀錄沒有完整手機和驗證碼", async () => {
    const before = new Date().toISOString();
    await createMockSms(store).sendVerificationCode({
      phone: "0987654321",
      code: "771234",
      locale: "zh-TW",
    });
    const { data } = await c.admin
      .from("provider_logs")
      .select("request")
      .eq("service", "sms")
      .gte("created_at", before);
    const text = JSON.stringify(data);
    expect(text).not.toContain("0987654321");
    expect(text).not.toContain("771234");
    await c.admin.from("provider_logs").delete().eq("service", "sms").gte("created_at", before);
  });

  it("依平台設定天數刪除過期紀錄，沒過期的保留", async () => {
    const old = new Date(Date.now() - 91 * 24 * 3600 * 1000).toISOString();
    const recent = new Date(Date.now() - 89 * 24 * 3600 * 1000).toISOString();
    const rows = [
      { idempotency_key: `dbtest-old-${Date.now()}`, created_at: old },
      { idempotency_key: `dbtest-recent-${Date.now()}`, created_at: recent },
    ].map((r) => ({
      service: "payment",
      implementation: "mock",
      action: "charge",
      status: "success",
      ...r,
    }));
    const ins = await c.admin.from("provider_logs").insert(rows);
    expect(ins.error).toBeNull();

    const { data: deleted, error } = await c.admin.rpc("purge_provider_logs");
    expect(error).toBeNull();
    expect(deleted).toBeGreaterThanOrEqual(1);
    const { data: left } = await c.admin
      .from("provider_logs")
      .select("idempotency_key")
      .in(
        "idempotency_key",
        rows.map((r) => r.idempotency_key),
      );
    expect(left?.map((r) => r.idempotency_key)).toEqual([rows[1].idempotency_key]);

    // 改成 30 天：89 天前的也刪掉
    await c.admin
      .from("platform_settings")
      .update({ int_value: 30 })
      .eq("key", "provider_logs_retention_days");
    await c.admin.rpc("purge_provider_logs");
    const { data: after } = await c.admin
      .from("provider_logs")
      .select("id")
      .eq("idempotency_key", rows[1].idempotency_key);
    expect(after).toHaveLength(0);
    await c.admin
      .from("platform_settings")
      .update({ int_value: 90 })
      .eq("key", "provider_logs_retention_days");
  });

  it("平台設定一個設定只能有一種值、金額要有幣別", async () => {
    const both = await c.admin
      .from("platform_settings")
      .insert({ key: "dbtest_bad", int_value: 1, text_value: "x" });
    expect(both.error).not.toBeNull();
    const noCurrency = await c.admin
      .from("platform_settings")
      .insert({ key: "dbtest_bad2", amount: 100 });
    expect(noCurrency.error).not.toBeNull();
    const ok = await c.admin
      .from("platform_settings")
      .insert({ key: "dbtest_fee", amount: 150, currency: "TWD" });
    expect(ok.error).toBeNull();
    await c.admin.from("platform_settings").delete().eq("key", "dbtest_fee");
  });
});
