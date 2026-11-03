import { findForbiddenKeys } from "./pii";
import type { EventStore } from "./store";
import { EVENT_TYPE_PATTERN, type EventMap, type EventType } from "./types";

export class EventPayloadError extends Error {
  name = "EventPayloadError";
}

/** 發出前的檢查：事件名稱格式、內容是物件、沒有個資欄位。 */
export function validateEvent(type: string, payload: unknown): void {
  if (!EVENT_TYPE_PATTERN.test(type)) {
    throw new EventPayloadError(`事件名稱格式應為 <模組>.<過去式>：${type}`);
  }
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new EventPayloadError(`事件內容必須是物件：${type}`);
  }
  const forbidden = findForbiddenKeys(payload);
  if (forbidden.length > 0) {
    // 只列出欄位名稱，不列出值，避免個資出現在錯誤訊息裡。
    throw new EventPayloadError(
      `事件內容不能有個資欄位（只放編號）：${type} → ${forbidden.join(", ")}`,
    );
  }
}

/**
 * 一般方式發出事件：寫完業務資料後呼叫（不在同一個交易）。
 * 跟錢、權限、後台操作紀錄、申訴有關的事件，請改用資料庫函式 public.emit_event()
 * 和業務資料寫在同一個交易（見 docs/架構說明.md 第 4 節）。
 */
export async function insertEvent<T extends EventType>(
  store: EventStore,
  type: T,
  payload: EventMap[T],
): Promise<string> {
  validateEvent(type, payload);
  const sourceModule = (type as string).split(".")[0];
  return store.insertEvent(type, sourceModule, payload as Record<string, unknown>);
}
