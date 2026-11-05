import { type CspMode, resolveCspMode } from "@/shared/security/csp";

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

/** 開發用的頁面（/health、/[語言]/dev/...）只在開發和 PR 預覽環境開啟。 */
export function isDevToolsEnabled(appEnv: AppEnv = getAppEnv()): boolean {
  return appEnv === "development" || appEnv === "preview";
}

/** `/health` 只在開發和 PR 預覽環境開啟。 */
export function isHealthCheckEnabled(appEnv: AppEnv = getAppEnv()): boolean {
  return isDevToolsEnabled(appEnv);
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

/** CSP 要擋下還是只回報（src/shared/security/csp.ts）。正式環境設成 report-only 會報錯。 */
export function getCspMode(): CspMode {
  return resolveCspMode(getAppEnv(), process.env.CSP_MODE);
}

/**
 * Cloudflare 官方的 Turnstile 測試金鑰（公開文件上的值，不是秘密）。
 * https://developers.cloudflare.com/turnstile/troubleshooting/testing/
 */
export const TURNSTILE_TEST_KEYS = {
  siteKey: {
    alwaysPasses: "1x00000000000000000000AA",
    alwaysBlocks: "2x00000000000000000000AB",
  },
  secretKey: {
    alwaysPasses: "1x0000000000000000000000000000000AA",
    alwaysFails: "2x0000000000000000000000000000000AA",
    alreadySpent: "3x0000000000000000000000000000000AA",
  },
} as const;

function isTurnstileTestKey(value: string): boolean {
  return /^[123]x0+[A-F]{2}$/.test(value);
}

/**
 * Turnstile（防機器人）的金鑰。
 * - 正式環境：一定要設定，而且不能是測試金鑰（測試金鑰誰都能通過）。
 * - 其他環境沒設定時用「一定通過」的測試金鑰。
 * 密鑰（secret）只能在伺服器端使用。
 */
export function getTurnstileSiteKey(appEnv: AppEnv = getAppEnv()): string {
  return turnstileKey(
    "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    TURNSTILE_TEST_KEYS.siteKey.alwaysPasses,
    appEnv,
  );
}

export function getTurnstileSecretKey(appEnv: AppEnv = getAppEnv()): string {
  return turnstileKey(
    "TURNSTILE_SECRET_KEY",
    process.env.TURNSTILE_SECRET_KEY,
    TURNSTILE_TEST_KEYS.secretKey.alwaysPasses,
    appEnv,
  );
}

function turnstileKey(name: string, value: string | undefined, testKey: string, appEnv: AppEnv) {
  if (appEnv !== "production") return value || testKey;
  const key = required(name, value);
  if (isTurnstileTestKey(key)) throw new Error(`正式環境的 ${name} 不能是 Turnstile 測試金鑰`);
  return key;
}

/**
 * Supabase Send SMS Hook 的簽章密鑰（#11），格式 v1,whsec_<base64>（Supabase 後台產生）。
 * 沒設定或格式不對回傳 null（/internal/auth/send-sms 會回 404）。
 */
export function getSendSmsHookSecret(): string | null {
  const value = process.env.SUPABASE_SEND_SMS_HOOK_SECRET;
  return value && /^v1,whsec_[A-Za-z0-9+/=]{24,}$/.test(value) ? value : null;
}
