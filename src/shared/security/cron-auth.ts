import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { getEventsCronSecret } from "@/shared/config/env";

/**
 * /internal/... 排程網址的密碼檢查（補處理、維護共用）。
 * Authorization: Bearer <EVENTS_CRON_SECRET>；比對用固定時間的方式（防計時攻擊）。
 * 沒設定密碼、密碼太短、密碼錯誤都回 false，呼叫的地方一律回 404。
 */
export function isCronAuthorized(request: Request): boolean {
  const secret = getEventsCronSecret();
  const header = request.headers.get("authorization");
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const given = createHash("sha256").update(header.slice("Bearer ".length)).digest();
  const expected = createHash("sha256").update(secret).digest();
  return timingSafeEqual(given, expected);
}
