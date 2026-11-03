import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { processEvents } from "@/shared/events/processor";
import { SupabaseEventStore } from "@/shared/events/supabase-store";
import { defineHandler } from "@/shared/events";
import { makeOnPinged } from "../fixtures/modules/example-receiver";
import { sendPing, sendPingAtomic } from "../fixtures/modules/example-sender";
import { createTestClients, type TestClients } from "./clients";
import { hasTestDb, skipReason } from "./supabase-test-env";

const title = "事件從 example-sender 送到 example-receiver";

describe.skipIf(!hasTestDb)(hasTestDb ? title : `${title}（${skipReason}）`, () => {
  let c: TestClients;
  let store: SupabaseEventStore;

  beforeAll(async () => {
    c = await createTestClients();
    store = new SupabaseEventStore(c.admin);
    // 測試專用 SQL 剛建立的資料表，等網站 API 讀到。
    for (let i = 0; i < 20; i++) {
      const { error } = await c.admin.from("example_receipts").select("event_id").limit(1);
      if (!error) break;
      await new Promise((r) => setTimeout(r, 500));
    }
  });
  afterAll(async () => {
    await c?.cleanup();
  });

  async function receiptsFor(pingId: string) {
    const { data, error } = await c.admin
      .from("example_receipts")
      .select("event_id")
      .eq("ping_id", pingId);
    expect(error).toBeNull();
    return data ?? [];
  }

  it("一般方式：A 發出事件，B 收到並寫入一筆紀錄", async () => {
    const pingId = await sendPing(c.admin, store, "simple");
    const summary = await processEvents({ store, handlers: [makeOnPinged(c.admin)] });
    expect(summary.done).toBeGreaterThanOrEqual(1);
    expect(await receiptsFor(pingId)).toHaveLength(1);
  });

  it("同交易方式：成功時資料和事件都寫入，B 收到", async () => {
    const pingId = await sendPingAtomic(c.admin, "atomic-ok");
    await processEvents({ store, handlers: [makeOnPinged(c.admin)] });
    expect(await receiptsFor(pingId)).toHaveLength(1);
  });

  it("同交易方式：發出事件後失敗，資料和事件都不會留下", async () => {
    const note = `atomic-fail-${crypto.randomUUID()}`;
    await expect(sendPingAtomic(c.admin, note, true)).rejects.toThrow();
    const pings = await c.admin.from("example_pings").select("id").eq("note", note);
    expect(pings.data).toHaveLength(0);
    const events = await c.admin
      .from("events")
      .select("id")
      .eq("type", "example-sender.pinged")
      .is("fanned_out_at", null);
    expect(events.data).toHaveLength(0);
  });

  it("同一個事件處理兩次，B 也只有一筆紀錄", async () => {
    const pingId = await sendPing(c.admin, store, "twice");
    await processEvents({ store, handlers: [makeOnPinged(c.admin)] });
    const { data } = await c.admin
      .from("events")
      .select("id, created_at")
      .eq("payload->>pingId", pingId)
      .single();
    // 模擬重試時又收到同一個事件
    await makeOnPinged(c.admin).handle({
      id: data!.id,
      type: "example-sender.pinged",
      payload: { pingId },
      createdAt: data!.created_at,
      attempt: 2,
    } as never);
    expect(await receiptsFor(pingId)).toHaveLength(1);
  });

  it("接收失敗會排定重試，錯誤訊息不含事件內容", async () => {
    const failing = defineHandler(
      "example-sender.pinged",
      "example-receiver.onPingedFailing",
      async () => {
        throw new Error("receiver down");
      },
    );
    const pingId = await sendPing(c.admin, store, "retry");
    const before = Date.now();
    await processEvents({ store, handlers: [makeOnPinged(c.admin), failing] });

    const { data: event } = await c.admin
      .from("events")
      .select("id")
      .eq("payload->>pingId", pingId)
      .single();
    const { data: delivery } = await c.admin
      .from("event_deliveries")
      .select("status, attempts, next_attempt_at, last_error")
      .eq("event_id", event!.id)
      .eq("handler", "example-receiver.onPingedFailing")
      .single();
    expect(delivery).toMatchObject({
      status: "pending",
      attempts: 1,
      last_error: "Error: receiver down",
    });
    expect(new Date(delivery!.next_attempt_at).getTime()).toBeGreaterThanOrEqual(before + 55_000);
    expect(delivery!.last_error).not.toContain(pingId);
    // 收據那個接收者不受影響
    expect(await receiptsFor(pingId)).toHaveLength(1);
  });

  it("兩個程式同時認領，不會拿到同一筆", async () => {
    for (let i = 0; i < 6; i++) await sendPing(c.admin, store, `concurrent-${i}`);
    await store.fanOut({ "example-sender.pinged": ["example-receiver.concurrencyProbe"] }, 500);

    const [a, b] = await Promise.all([store.claim(4, 60, 6), store.claim(4, 60, 6)]);
    const probeIds = (list: typeof a) =>
      list
        .filter((d) => d.handler === "example-receiver.concurrencyProbe")
        .map((d) => d.deliveryId);
    const idsA = probeIds(a);
    const idsB = probeIds(b);
    expect(idsA.filter((id) => idsB.includes(id))).toEqual([]);

    for (const d of [...a, ...b]) await store.markDone(d.deliveryId, d.attempts);
  });
});
