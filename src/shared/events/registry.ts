import { HANDLER_NAME_PATTERN, EVENT_TYPE_PATTERN, type HandlerRegistration } from "./types";

// 用 globalThis 保存，避免同一個伺服器裡模組被載入兩次時各自一份。
const KEY = Symbol.for("sillymom.eventHandlers");
type GlobalWithHandlers = typeof globalThis & { [KEY]?: HandlerRegistration[] };

export function validateHandlers(handlers: HandlerRegistration[]): void {
  const seen = new Set<string>();
  for (const h of handlers) {
    if (!EVENT_TYPE_PATTERN.test(h.type)) throw new Error(`事件名稱格式錯誤：${h.type}`);
    if (!HANDLER_NAME_PATTERN.test(h.name)) throw new Error(`接收者名稱格式錯誤：${h.name}`);
    if (seen.has(h.name)) throw new Error(`接收者名稱重複：${h.name}`);
    seen.add(h.name);
  }
}

/** 伺服器啟動時（src/instrumentation.ts）設定接收者清單。 */
export function configureEventHandlers(handlers: HandlerRegistration[]): void {
  validateHandlers(handlers);
  (globalThis as GlobalWithHandlers)[KEY] = handlers;
}

/** 還沒設定時回傳 null：事件會先存著，等補處理時再處理。 */
export function getConfiguredEventHandlers(): HandlerRegistration[] | null {
  return (globalThis as GlobalWithHandlers)[KEY] ?? null;
}
