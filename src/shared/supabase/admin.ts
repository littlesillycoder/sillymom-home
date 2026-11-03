import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig, getSupabaseSecretKey } from "@/shared/config/env";

/**
 * 伺服器專用的 Supabase 連線，使用 secret key，會略過 Row Level Security。
 * 只用在系統工作（例如 /health），不要拿來處理使用者的請求資料。
 */
export function createAdminClient() {
  const { url } = getSupabasePublicConfig();
  return createClient(url, getSupabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
