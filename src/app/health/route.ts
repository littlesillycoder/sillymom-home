import { connection } from "next/server";
import { getAppEnv, isHealthCheckEnabled } from "@/shared/config/env";
import { checkDatabase } from "@/shared/health/check";

/**
 * 工程檢查用：確認網站能讀寫 Supabase。
 * 只在 development、preview 開啟；demo、production 一律回 404。
 * 回傳內容不含金鑰或個資。
 */
export async function GET() {
  await connection();

  const appEnv = getAppEnv();
  if (!isHealthCheckEnabled(appEnv)) {
    return new Response(null, { status: 404 });
  }

  const startedAt = Date.now();
  const result = await checkDatabase(new Date().toISOString());

  if (!result.ok) {
    return Response.json(
      { status: "error", appEnv, error: result.error, elapsedMs: Date.now() - startedAt },
      { status: 503 },
    );
  }

  return Response.json({
    status: "ok",
    appEnv,
    supabase: {
      host: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").host,
      write: "ok",
      read: "ok",
      lastCheckedAt: result.lastCheckedAt,
    },
    elapsedMs: Date.now() - startedAt,
  });
}
