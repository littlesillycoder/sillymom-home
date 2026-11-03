import "server-only";
import { createAdminClient } from "@/shared/supabase/admin";

export type HealthCheckResult = { ok: true; lastCheckedAt: string } | { ok: false; error: string };

/**
 * 工程檢查：寫入再讀出 health_check，確認能讀寫資料庫。
 * 用 admin 連線（略過 RLS），所以放在 shared/ 而不是 app/，頁面不能直接拿到 admin 連線。
 */
export async function checkDatabase(checkedAt: string): Promise<HealthCheckResult> {
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

    return { ok: true, lastCheckedAt: read.data.checked_at };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "unknown error" };
  }
}
