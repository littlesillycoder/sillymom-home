/**
 * 執行環境設定。所有環境變數都從這裡讀，其他地方不直接讀 process.env。
 *
 * APP_ENV：
 * - development：本機開發
 * - preview：每個 PR 的預覽網址
 * - demo：給投資人看的展示網站
 * - production：正式網站
 */
export const APP_ENVS = ["development", "preview", "demo", "production"] as const;
export type AppEnv = (typeof APP_ENVS)[number];

export function parseAppEnv(value: string | undefined): AppEnv {
  // 沒設定或設定錯誤時，當成最嚴格的 production，避免不小心打開開發用功能。
  return APP_ENVS.find((env) => env === value) ?? "production";
}

export function getAppEnv(): AppEnv {
  return parseAppEnv(process.env.APP_ENV);
}

/** `/health` 只在開發和 PR 預覽環境開啟。 */
export function isHealthCheckEnabled(appEnv: AppEnv = getAppEnv()): boolean {
  return appEnv === "development" || appEnv === "preview";
}

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`缺少環境變數 ${name}，請參考 .env.example`);
  }
  return value;
}

/** 瀏覽器和伺服器都能用的 Supabase 設定（可以公開）。 */
export function getSupabasePublicConfig() {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    publishableKey: required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  };
}

/** 只能在伺服器端使用的 Supabase 金鑰（會略過 Row Level Security）。 */
export function getSupabaseSecretKey(): string {
  return required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY);
}

/** 補處理網址的密碼至少要這麼長，太短當成沒設定。 */
export const MIN_CRON_SECRET_LENGTH = 32;

/** 補處理網址 /internal/events/process 的密碼。沒設定或太短回傳 null（網址會回 404）。 */
export function getEventsCronSecret(): string | null {
  const value = process.env.EVENTS_CRON_SECRET;
  return value && value.length >= MIN_CRON_SECRET_LENGTH ? value : null;
}
