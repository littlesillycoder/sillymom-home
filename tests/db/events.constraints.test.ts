import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestClients, type TestClients } from "./clients";
import { hasTestDb, skipReason } from "./supabase-test-env";

const title = "資料庫層的事件檢查";

describe.skipIf(!hasTestDb)(hasTestDb ? title : `${title}（${skipReason}）`, () => {
  let c: TestClients;
  const emit = (type: string, source: string, payload: unknown) =>
    c.admin.rpc("emit_event", { p_type: type, p_source: source, p_payload: payload });

  beforeAll(async () => {
    c = await createTestClients();
  });
  afterAll(async () => {
    await c?.cleanup();
  });

  it.each([
    { customerPhone: "0912345678" },
    { booking: { id: "b1", home_address: "台北市" } },
    { items: [{ ok: 1 }, { email: "a@b.c" }] },
    { fullName: "王小美" },
    { idNumber: "A123456789" },
  ])("有個資欄位的事件被資料庫擋下：%j", async (payload) => {
    const { error } = await emit("constraint-check.created", "constraint-check", payload);
    expect(error).not.toBeNull();
  });

  it("只有編號的事件可以寫入", async () => {
    const { data, error } = await emit("constraint-check.created", "constraint-check", {
      bookingId: "b1",
      amount: 100,
    });
    expect(error).toBeNull();
    await c.admin.from("events").delete().eq("id", data);
  });

  it("事件名稱的模組和發出模組不同會被擋下", async () => {
    const { error } = await emit("billing.charged", "video", {});
    expect(error).not.toBeNull();
  });

  it("事件內容超過 8KB 會被擋下", async () => {
    const { error } = await emit("constraint-check.created", "constraint-check", {
      blob: "x".repeat(9000),
    });
    expect(error).not.toBeNull();
  });

  it("事件內容不是物件會被擋下", async () => {
    const { error } = await emit("constraint-check.created", "constraint-check", [1, 2]);
    expect(error).not.toBeNull();
  });
});
