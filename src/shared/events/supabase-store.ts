import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClaimedDelivery, EventStore } from "./store";
import type { EventPayload } from "./types";

type ClaimRow = {
  delivery_id: string;
  event_id: string;
  handler: string;
  attempts: number;
  event_type: string;
  payload: EventPayload;
  event_created_at: string;
};

/**
 * 用 Supabase 存事件。傳入的連線必須是伺服器端的 secret key 連線
 * （事件表對一般使用者沒有任何權限）。
 */
export class SupabaseEventStore implements EventStore {
  constructor(private readonly db: SupabaseClient) {}

  async insertEvent(type: string, sourceModule: string, payload: EventPayload) {
    const { data, error } = await this.db.rpc("emit_event", {
      p_type: type,
      p_source: sourceModule,
      p_payload: payload,
    });
    if (error) throw new Error(`emit_event failed: ${error.message}`);
    return data as string;
  }

  async fanOut(subscriptions: Record<string, string[]>, limit: number) {
    const { data, error } = await this.db.rpc("fan_out_events", {
      p_subscriptions: subscriptions,
      p_limit: limit,
    });
    if (error) throw new Error(`fan_out_events failed: ${error.message}`);
    return data as number;
  }

  async claim(limit: number, lockSeconds: number, maxAttempts: number) {
    const { data, error } = await this.db.rpc("claim_event_deliveries", {
      p_limit: limit,
      p_lock_seconds: lockSeconds,
      p_max_attempts: maxAttempts,
    });
    if (error) throw new Error(`claim_event_deliveries failed: ${error.message}`);
    return ((data ?? []) as ClaimRow[]).map((row): ClaimedDelivery => ({
      deliveryId: row.delivery_id,
      eventId: row.event_id,
      handler: row.handler,
      attempts: row.attempts,
      eventType: row.event_type,
      payload: row.payload,
      eventCreatedAt: row.event_created_at,
    }));
  }

  // 更新時都比對 status 和 attempts：只更新自己認領的那一次，
  // 避免鎖過期後被別的程式重新認領時互相覆蓋。
  private async update(deliveryId: string, attempts: number, values: Record<string, unknown>) {
    const { error } = await this.db
      .from("event_deliveries")
      .update(values)
      .eq("id", deliveryId)
      .eq("status", "processing")
      .eq("attempts", attempts);
    if (error) throw new Error(`update event_deliveries failed: ${error.message}`);
  }

  markDone(deliveryId: string, attempts: number) {
    return this.update(deliveryId, attempts, {
      status: "done",
      processed_at: new Date().toISOString(),
      locked_until: null,
      last_error: null,
    });
  }

  markRetry(deliveryId: string, attempts: number, nextAttemptAt: Date, error: string) {
    return this.update(deliveryId, attempts, {
      status: "pending",
      next_attempt_at: nextAttemptAt.toISOString(),
      locked_until: null,
      last_error: error,
    });
  }

  markFailed(deliveryId: string, attempts: number, error: string) {
    return this.update(deliveryId, attempts, {
      status: "failed",
      locked_until: null,
      last_error: error,
    });
  }
}
