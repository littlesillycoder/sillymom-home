import { createHash, timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { getEventsCronSecret } from "@/shared/config/env";
import { runEventProcessing } from "@/shared/events/server";
import { eventHandlers } from "@/event-handlers";

/**
 * 補處理網址：給排程（#83 設定 Cloudflare Cron）定時呼叫，處理到期和重試的事件。
 *
 * 資安：
 * - 只接受 POST（其他方法 Next.js 自動回 405）。
 * - 要帶 Authorization: Bearer <EVENTS_CRON_SECRET>，比對用固定時間的方式（防計時攻擊）。
 * - 沒設定密碼、密碼太短、密碼錯誤，一律回 404，不透露這個網址存在。
 * - 回應只有筆數，不含事件內容。
 */
export async function POST(request: Request) {
  await connection();

  const secret = getEventsCronSecret();
  if (!secret || !isAuthorized(request.headers.get("authorization"), secret)) {
    return new Response(null, { status: 404 });
  }

  const summary = await runEventProcessing(eventHandlers);
  return Response.json(summary);
}

function isAuthorized(header: string | null, secret: string): boolean {
  if (!header?.startsWith("Bearer ")) return false;
  // 先做雜湊，讓長度一致，才能用 timingSafeEqual。
  const given = createHash("sha256").update(header.slice("Bearer ".length)).digest();
  const expected = createHash("sha256").update(secret).digest();
  return timingSafeEqual(given, expected);
}
