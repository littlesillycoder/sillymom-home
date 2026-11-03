import type { PostgrestError } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestClients, type TestClients } from "./clients";
import { hasTestDb, skipReason } from "./supabase-test-env";

const title = "資料庫層的事件檢查";

/** 錯誤訊息的每個部分（message、details、hint）都不能出現被擋下的值。 */
function expectNoLeak(error: PostgrestError | null, secret: string) {
  expect(error).not.toBeNull();
  const text = [error?.message, error?.details, error?.hint].join(" | ");
  expect(text).not.toContain(secret);
  expect(text).not.toContain("Failing row");
}

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
    [{ customerPhone: "0912345678" }, "0912345678", "customerPhone"],
    [{ booking: { id: "b1", home_address: "台北市信義區" } }, "台北市信義區", "home_address"],
    [{ items: [{ ok: 1 }, { email: "amy@example.com" }] }, "amy@example.com", "email"],
    [{ fullName: "王小美" }, "王小美", "fullName"],
    [{ idNumber: "A123456789" }, "A123456789", "idNumber"],
  ])("有個資欄位的事件被擋下，錯誤只列欄位名稱、不列值：%j", async (payload, value, key) => {
    const { error } = await emit("constraint-check.created", "constraint-check", payload);
    expectNoLeak(error, value);
    expect(error?.message).toContain(key);
  });

  it("只有編號的事件可以寫入", async () => {
    const { data, error } = await emit("constraint-check.created", "constraint-check", {
      bookingId: "b1",
      amount: 100,
    });
    expect(error).toBeNull();
    await c.admin.from("events").delete().eq("id", data);
  });

  it("事件名稱的模組和發出模組不同會被擋下，錯誤不帶出內容", async () => {
    const { error } = await emit("billing.charged", "video", { bookingId: "secret-b1" });
    expectNoLeak(error, "secret-b1");
  });

  it("事件名稱格式錯誤會被擋下", async () => {
    const { error } = await emit("Bad Type", "constraint-check", { bookingId: "secret-b2" });
    expectNoLeak(error, "secret-b2");
  });

  it("事件內容超過 8KB 會被擋下，錯誤不帶出內容", async () => {
    const blob = "secret-blob-" + "x".repeat(9000);
    const { error } = await emit("constraint-check.created", "constraint-check", { blob });
    expectNoLeak(error, "secret-blob-");
  });

  it("事件內容不是物件會被擋下", async () => {
    const { error } = await emit("constraint-check.created", "constraint-check", ["secret-arr"]);
    expectNoLeak(error, "secret-arr");
  });

  it("更新事件時也會檢查（不能事後塞入個資）", async () => {
    const { data: id } = await emit("constraint-check.created", "constraint-check", {
      bookingId: "b1",
    });
    const { error } = await c.admin
      .from("events")
      .update({ payload: { customerPhone: "0987654321" } })
      .eq("id", id);
    expectNoLeak(error, "0987654321");
    await c.admin.from("events").delete().eq("id", id);
  });
});
