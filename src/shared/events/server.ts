import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/shared/supabase/admin";
import { insertEvent } from "./emit";
import { processEvents, type ProcessSummary } from "./processor";
import { getConfiguredEventHandlers } from "./registry";
import type { EventStore } from "./store";
import { SupabaseEventStore } from "./supabase-store";
import type { EventMap, EventType, HandlerRegistration } from "./types";

export { configureEventHandlers } from "./registry";
export { EventPayloadError } from "./emit";
export type { ProcessSummary } from "./processor";

function defaultStore(): EventStore {
  return new SupabaseEventStore(createAdminClient());
}

/**
 * 一般方式發出事件（寫完業務資料後呼叫）。回應使用者之後立刻處理；
 * 沒處理到的（例如伺服器中斷）由補處理網址 /internal/events/process 接手。
 *
 * 跟錢、權限、後台操作紀錄、申訴有關的事件，請改用資料庫函式 public.emit_event()，
 * 和業務資料寫在同一個交易。
 */
export async function emitEvent<T extends EventType>(
  type: T,
  payload: EventMap[T],
): Promise<string> {
  const id = await insertEvent(defaultStore(), type, payload);
  scheduleProcessing();
  return id;
}

/** 在回應使用者之後處理事件。不在請求裡（例如測試）就略過，交給補處理。 */
export function scheduleProcessing(): void {
  const handlers = getConfiguredEventHandlers();
  if (!handlers) return;
  try {
    after(async () => {
      try {
        await processEvents({ store: defaultStore(), handlers });
      } catch {
        // 失敗不影響使用者；補處理會再試。不印出內容，避免個資進 log。
        console.error("[events] processing after response failed");
      }
    });
  } catch {
    // 不在請求範圍內，交給補處理。
  }
}

/** 補處理網址用：處理一批到期的事件。 */
export function runEventProcessing(handlers: HandlerRegistration[]): Promise<ProcessSummary> {
  return processEvents({ store: defaultStore(), handlers, limit: 50 });
}
