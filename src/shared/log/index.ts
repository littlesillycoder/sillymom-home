import { maskValue, serializeError } from "./mask";

/**
 * 統一的 log 工具（#6）。其他程式不能直接用 console（lint 會擋）。
 *
 * 用法：
 *   log.info("booking.accepted", { bookingId });
 *   log.error("events.process_failed", error, { deliveryId });
 *
 * - 事件名稱：固定的英文代號（小寫、數字、. _ -），不能放變數或使用者輸入。
 * - 欄位：自動遮蔽個資（src/shared/log/mask.ts）。地址、姓名只能放在有名稱的欄位。
 * - 輸出一行 JSON，Cloudflare Workers 的 log 會收集。
 */

export type LogLevel = "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

const EVENT_NAME = /^[a-z][a-z0-9_.-]{0,63}$/;

export type LogEntry = {
  level: LogLevel;
  event: string;
  time: string;
  error?: { name: string; message?: string };
  data?: unknown;
};

export function buildEntry(
  level: LogLevel,
  event: string,
  fields?: LogFields,
  error?: unknown,
): LogEntry {
  return {
    level,
    // 名稱格式不對時不寫出原本的字（可能是使用者輸入）
    event: EVENT_NAME.test(event) ? event : "invalid_event_name",
    time: new Date().toISOString(),
    ...(error !== undefined ? { error: serializeError(error) } : {}),
    ...(fields ? { data: maskValue(fields) } : {}),
  };
}

function write(entry: LogEntry) {
  const line = JSON.stringify(entry);
  if (entry.level === "error") console.error(line);
  else if (entry.level === "warn") console.warn(line);
  else console.info(line);
}

export const log = {
  info(event: string, fields?: LogFields) {
    write(buildEntry("info", event, fields));
  },
  warn(event: string, fields?: LogFields) {
    write(buildEntry("warn", event, fields));
  },
  error(event: string, error?: unknown, fields?: LogFields) {
    write(buildEntry("error", event, fields, error));
  },
};

export { maskString, maskValue } from "./mask";
