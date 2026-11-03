/**
 * 事件型別表。各模組在自己的 events.ts 用 declaration merging 加入事件：
 *
 *   declare module "@/shared/events" {
 *     interface EventMap {
 *       "video.ended": { videoSessionId: string; durationSeconds: number };
 *     }
 *   }
 *
 * 事件內容只放編號和數字，不放個資（手機、地址、姓名、Email、證件號碼…）。
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface EventMap {}

export type EventType = keyof EventMap & string;

/** 事件內容：只能是 JSON 物件。 */
export type EventPayload = Record<string, unknown>;

export type EventEnvelope<T extends EventType = EventType> = {
  id: string;
  type: T;
  payload: EventMap[T];
  createdAt: string;
  /** 第幾次嘗試處理（從 1 開始）。 */
  attempt: number;
};

/** 接收者必須寫成「執行兩次結果一樣」：重試時可能收到同一個事件。 */
export type EventHandler<T extends EventType = EventType> = (
  event: EventEnvelope<T>,
) => Promise<void>;

export type HandlerRegistration = {
  /** 事件類型，例如 video.ended */
  type: string;
  /** 接收者名稱，格式 <模組>.<處理函式>，例如 billing.onVideoEnded */
  name: string;
  handle: (event: EventEnvelope<never>) => Promise<void>;
};

/** 註冊接收者時用，讓事件內容的型別自動對上。 */
export function defineHandler<T extends EventType>(
  type: T,
  name: string,
  handle: EventHandler<T>,
): HandlerRegistration {
  return { type, name, handle: handle as HandlerRegistration["handle"] };
}

export const EVENT_TYPE_PATTERN = /^[a-z][a-z0-9-]*\.[a-z][a-z0-9_]*$/;
export const HANDLER_NAME_PATTERN = /^[a-z][a-z0-9-]*\.[a-zA-Z][a-zA-Z0-9_]*$/;
