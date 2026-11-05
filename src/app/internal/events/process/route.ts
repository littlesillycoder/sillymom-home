import { connection } from "next/server";
import { runEventProcessing } from "@/shared/events/server";
import { isCronAuthorized } from "@/shared/security/cron-auth";
import { eventHandlers } from "@/event-handlers";

/**
 * 補處理網址：給排程（#83 設定 Cloudflare Cron）定時呼叫，處理到期和重試的事件。
 *
 * 資安：
 * - 只接受 POST（其他方法 Next.js 自動回 405）。
 * - 要帶 Authorization: Bearer <EVENTS_CRON_SECRET>（shared/security/cron-auth.ts）。
 * - 沒設定密碼、密碼太短、密碼錯誤，一律回 404，不透露這個網址存在。
 * - 回應只有筆數，不含事件內容。
 */
export async function POST(request: Request) {
  await connection();
  if (!isCronAuthorized(request)) return new Response(null, { status: 404 });
  const summary = await runEventProcessing(eventHandlers);
  return Response.json(summary);
}
