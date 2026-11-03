/**
 * 事件機制的公開介面（瀏覽器和伺服器都能 import，只有型別和小工具）。
 * 發出事件、處理事件請 import "@/shared/events/server"。
 */
export type {
  EventMap,
  EventType,
  EventPayload,
  EventEnvelope,
  EventHandler,
  HandlerRegistration,
} from "./types";
export { defineHandler } from "./types";
