import type { EventPayload } from "./types";

export type ClaimedDelivery = {
  deliveryId: string;
  eventId: string;
  handler: string;
  attempts: number;
  eventType: string;
  payload: EventPayload;
  eventCreatedAt: string;
};

/** 事件資料的存取介面。正式用 Supabase；單元測試用記憶體版本。 */
export interface EventStore {
  insertEvent(type: string, sourceModule: string, payload: EventPayload): Promise<string>;
  /** 依接收者清單建立處理紀錄，回傳分派的事件數。 */
  fanOut(subscriptions: Record<string, string[]>, limit: number): Promise<number>;
  /** 認領到期的處理紀錄（會鎖住，避免兩個程式同時處理）。 */
  claim(limit: number, lockSeconds: number, maxAttempts: number): Promise<ClaimedDelivery[]>;
  markDone(deliveryId: string, attempts: number): Promise<void>;
  markRetry(
    deliveryId: string,
    attempts: number,
    nextAttemptAt: Date,
    error: string,
  ): Promise<void>;
  markFailed(deliveryId: string, attempts: number, error: string): Promise<void>;
}
