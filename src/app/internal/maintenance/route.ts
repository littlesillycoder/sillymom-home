import { connection } from "next/server";
import { purgeExpiredProviderLogs } from "@/shared/maintenance/purge";
import { isCronAuthorized } from "@/shared/security/cron-auth";

/**
 * 維護網址：給排程（#83 設定，建議每天一次）呼叫，刪除過期資料。
 * 目前：外部服務紀錄（保存天數在平台設定）。
 * 資安同補處理網址：只接受 POST、要密碼、錯誤一律 404、回應只有筆數。
 */
export async function POST(request: Request) {
  await connection();
  if (!isCronAuthorized(request)) return new Response(null, { status: 404 });
  const providerLogsDeleted = await purgeExpiredProviderLogs();
  return Response.json({ providerLogsDeleted });
}
