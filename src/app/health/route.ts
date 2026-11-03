import { connection } from "next/server";
import { getAppEnv, isHealthCheckEnabled } from "@/shared/config/env";
import { createAdminClient } from "@/shared/supabase/admin";

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
  const checkedAt = new Date().toISOString();

  try {
    const supabase = createAdminClient();

    const write = await supabase
      .from("health_check")
      .upsert({ id: 1, checked_at: checkedAt })
      .select("checked_at")
      .single();
    if (write.error) throw new Error(`write: ${write.error.message}`);

    const read = await supabase.from("health_check").select("checked_at").eq("id", 1).single();
    if (read.error) throw new Error(`read: ${read.error.message}`);

    return Response.json({
      status: "ok",
      appEnv,
      supabase: {
        host: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").host,
        write: "ok",
        read: "ok",
        lastCheckedAt: read.data.checked_at,
      },
      elapsedMs: Date.now() - startedAt,
    });
  } catch (error) {
    return Response.json(
      {
        status: "error",
        appEnv,
        error: error instanceof Error ? error.message : "unknown error",
        elapsedMs: Date.now() - startedAt,
      },
      { status: 503 },
    );
  }
}
