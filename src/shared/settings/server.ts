import "server-only";
import { createAdminClient } from "@/shared/supabase/admin";

/**
 * 讀平台設定（platform_settings）。只能在伺服器端用：一般使用者讀不到這張表。
 * 設定一定要存在、型別要對，不然直接報錯（不用寫死的預設值頂替）。
 */
async function readSetting(key: string) {
  const { data, error } = await createAdminClient()
    .from("platform_settings")
    .select("int_value, text_value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(`讀取平台設定失敗：${key}`);
  if (!data) throw new Error(`平台設定不存在：${key}`);
  return data;
}

export async function getIntSetting(key: string): Promise<number> {
  const { int_value } = await readSetting(key);
  if (int_value === null) throw new Error(`平台設定不是整數：${key}`);
  return int_value;
}

export async function getTextSetting(key: string): Promise<string> {
  const { text_value } = await readSetting(key);
  if (text_value === null) throw new Error(`平台設定不是文字：${key}`);
  return text_value;
}
