import "server-only";
import { createAdminClient } from "@/shared/supabase/admin";

/** 依平台設定刪除過期的外部服務紀錄（預設 90 天），回傳刪除筆數。 */
export async function purgeExpiredProviderLogs(): Promise<number> {
  const { data, error } = await createAdminClient().rpc("purge_provider_logs");
  if (error) throw new Error(`刪除過期外部服務紀錄失敗：${error.message}`);
  return data as number;
}
