import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestClients, type TestClients } from "./clients";
import { hasTestDb, skipReason } from "./supabase-test-env";

const title = "資安基本設定（資料庫）";
const PROBE = "zz_rls_auto_enable_probe";

describe.skipIf(!hasTestDb)(hasTestDb ? title : `${title}（${skipReason}）`, () => {
  let c: TestClients;

  beforeAll(async () => {
    c = await createTestClients();
  });
  afterAll(async () => {
    await c?.cleanup();
  });

  it("public 的所有資料表都有開啟 Row Level Security", async () => {
    const { data, error } = await c.admin.rpc("test_tables_without_rls");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("新增資料表時自動開啟 RLS（建表時沒寫 enable row level security）", async () => {
    const { data, error } = await c.admin.rpc("test_table_has_rls", { p_table: PROBE });
    expect(error).toBeNull();
    expect(data).toBe(true);
  });

  for (const who of ["未登入", "已登入"] as const) {
    it(`自動開啟 RLS 的資料表，${who}的使用者讀不到、寫不進去`, async () => {
      const client = who === "未登入" ? c.anon : c.signedIn;
      const read = await client.from(PROBE).select("*");
      expect(read.data ?? []).toEqual([]);
      const write = await client.from(PROBE).insert({ id: 2, note: "x" });
      expect(write.error).not.toBeNull();
    });
  }

  it("伺服器端（secret key）讀得到，證明資料真的在", async () => {
    const { data } = await c.admin.from(PROBE).select("id");
    expect(data).toEqual([{ id: 1 }]);
  });

  it("登入沒有通過 Turnstile（沒帶 captchaToken）會被 Supabase 擋下", async () => {
    const email = `captcha-${crypto.randomUUID()}@example.com`;
    const password = `pw-${crypto.randomUUID()}`;
    const created = await c.admin.auth.admin.createUser({ email, password, email_confirm: true });
    try {
      const { error } = await c.anon.auth.signInWithPassword({ email, password });
      expect(error?.message ?? "").toMatch(/captcha/i);
    } finally {
      await c.admin.auth.admin.deleteUser(created.data.user!.id);
    }
  });

  it("一般使用者不能執行自動開啟 RLS 的函式", async () => {
    const { error } = await c.signedIn.rpc("rls_auto_enable");
    expect(error).not.toBeNull();
  });
});
