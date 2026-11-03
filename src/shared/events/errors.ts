const MAX_ERROR_LENGTH = 500;

/**
 * 處理失敗時要存進資料庫的錯誤訊息。
 * 資安：只取訊息文字、遮掉看起來像個資的內容（Email、長串數字），並截短。不存事件內容。
 */
export function sanitizeError(error: unknown): string {
  const raw =
    error instanceof Error ? `${error.name}: ${error.message}` : `Unknown error: ${String(error)}`;
  const redacted = raw
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[email]")
    .replace(/\+?\d[\d\s-]{6,}\d/g, "[number]");
  return redacted.length > MAX_ERROR_LENGTH
    ? `${redacted.slice(0, MAX_ERROR_LENGTH - 1)}…`
    : redacted;
}
