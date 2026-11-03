import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestClients, type TestClients } from "./clients";
import { hasTestDb, skipReason } from "./supabase-test-env";

const title = "事件資料表和函式的權限";

describe.skipIf(!hasTestDb)(hasTestDb ? title : `${title}（${skipReason}）`, () => {
  let c: TestClients;
  let eventId: string;

  beforeAll(async () => {
    c = await createTestClients();
    const { data, error } = await c.admin.rpc("emit_event", {
      p_type: "rls-check.created",
      p_source: "rls-check",
      p_payload: { thingId: "t1" },
    });
    expect(error).toBeNull();
    eventId = data;
    const fan = await c.admin.rpc("fan_out_events", {
      p_subscriptions: { "rls-check.created": ["rls-check.onCreated"] },
      p_limit: 500,
    });
    expect(fan.error).toBeNull();
  });

  afterAll(async () => {
    await c?.admin.from("events").delete().eq("id", eventId);
    await c?.cleanup();
  });

  it("伺服器端（secret key）可以讀到事件和處理紀錄", async () => {
    const events = await c.admin.from("events").select("id").eq("id", eventId);
    expect(events.data).toHaveLength(1);
    const deliveries = await c.admin.from("event_deliveries").select("id").eq("event_id", eventId);
    expect(deliveries.data).toHaveLength(1);
  });

  for (const who of ["未登入", "已登入"] as const) {
    const client = (): SupabaseClient => (who === "未登入" ? c.anon : c.signedIn);

    for (const table of ["events", "event_deliveries"]) {
      it(`${who}的使用者讀不到 ${table}`, async () => {
        const { data } = await client().from(table).select("id");
        expect(data ?? []).toHaveLength(0);
      });
    }

    it(`${who}的使用者寫不進 events`, async () => {
      const { error } = await client()
        .from("events")
        .insert({ type: "rls-check.created", source_module: "rls-check", payload: {} });
      expect(error).not.toBeNull();
    });

    it(`${who}的使用者改不了 event_deliveries`, async () => {
      await client().from("event_deliveries").update({ status: "done" }).eq("event_id", eventId);
      const { data } = await c.admin
        .from("event_deliveries")
        .select("status")
        .eq("event_id", eventId)
        .single();
      expect(data?.status).toBe("pending");
    });

    it(`${who}的使用者不能呼叫事件函式`, async () => {
      const calls = [
        client().rpc("emit_event", {
          p_type: "rls-check.created",
          p_source: "rls-check",
          p_payload: {},
        }),
        client().rpc("fan_out_events", { p_subscriptions: {}, p_limit: 1 }),
        client().rpc("claim_event_deliveries", {
          p_limit: 1,
          p_lock_seconds: 60,
          p_max_attempts: 6,
        }),
      ];
      for (const result of await Promise.all(calls)) {
        expect(result.error).not.toBeNull();
      }
    });
  }
});
