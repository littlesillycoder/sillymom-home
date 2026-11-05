import type { AppEnv } from "@/shared/config/env";

/**
 * Content-Security-Policy（#6）：限制網頁只能執行哪些來源的程式。
 *
 * - 每次請求產生新的 nonce（一次性密碼），只有帶這個 nonce 的 <script> 能執行。
 *   'strict-dynamic'：有 nonce 的程式再載入的程式也可以執行（Next.js、Turnstile 需要），
 *   但網址白名單和 'unsafe-inline' 會被瀏覽器忽略，被插入的程式碼不能執行。
 * - 其他項目全部鎖住；新增外部網域（綠界、LiveKit）時，在各自的 issue 加到 EXTERNAL_ORIGINS。
 * - 本機開發的 style-src 允許 'unsafe-inline'（Next.js 開發工具需要），正式版本不允許。
 * - style-src-attr 'unsafe-inline'：React 的 style={{...}} 會變成 HTML 的 style 屬性（例如進度條寬度）。
 *   style 屬性不能執行程式，風險低；<style> 標籤仍然要 nonce。
 */

/** Cloudflare Turnstile（防機器人）的網域 */
export const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

export const CSP_MODES = ["enforce", "report-only"] as const;
export type CspMode = (typeof CSP_MODES)[number];

export class CspConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CspConfigError";
  }
}

/**
 * CSP 要「擋下」還是「只回報」（Report-Only）。
 * - 有設定 CSP_MODE 就照設定；設定錯的值直接報錯。
 * - 沒設定：本機開發擋下（有問題馬上發現）；預覽、展示只回報（先確認沒誤擋）；正式環境擋下。
 * - 正式環境一定要擋下：設成 report-only 直接報錯，不會假裝有保護。
 */
export function resolveCspMode(appEnv: AppEnv, value: string | undefined): CspMode {
  let mode: CspMode;
  if (value === undefined || value === "") {
    mode = appEnv === "preview" || appEnv === "demo" ? "report-only" : "enforce";
  } else {
    const found = CSP_MODES.find((m) => m === value);
    if (!found) throw new CspConfigError(`CSP_MODE 只能是 ${CSP_MODES.join("、")}`);
    mode = found;
  }
  if (appEnv === "production" && mode !== "enforce") {
    throw new CspConfigError("正式環境的 CSP 一定要擋下（CSP_MODE=enforce）");
  }
  return mode;
}

export function cspHeaderName(mode: CspMode): string {
  return mode === "enforce" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";
}

/** 128 位元的加密等級亂數，base64 編碼。每次請求都要重新產生。 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/** nonce 的格式：16 bytes 的 base64（24 個字元）。 */
export const NONCE_PATTERN = /^[A-Za-z0-9+/]{22}==$/;

/** 從 Supabase 網址算出 https 和 wss（即時連線）兩個來源；網址不合法就不加。 */
function supabaseOrigins(url: string | undefined): string[] {
  if (!url) return [];
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return [];
    const ws = u.protocol === "https:" ? "wss:" : "ws:";
    return [u.origin, `${ws}//${u.host}`];
  } catch {
    return [];
  }
}

export type CspOptions = {
  nonce: string;
  /** 本機開發：React 需要 'unsafe-eval' 顯示錯誤位置，Next.js 需要 ws: 自動重新整理。 */
  isDev: boolean;
  supabaseUrl: string | undefined;
};

export function buildCsp({ nonce, isDev, supabaseUrl }: CspOptions): string {
  const supabase = supabaseOrigins(supabaseUrl);
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      TURNSTILE_ORIGIN,
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    // 本機開發：Next.js 會插入沒有 nonce 的 <style>（修改 CSS 即時更新用），只在開發時放寬樣式。
    // 正式版本的 CSS 都是檔案，沒有 <style>，一律要 nonce。
    "style-src": isDev ? ["'self'", "'unsafe-inline'"] : ["'self'", `'nonce-${nonce}'`],
    "style-src-attr": ["'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...supabase, ...(isDev ? ["ws:"] : [])],
    "frame-src": [TURNSTILE_ORIGIN],
    "worker-src": ["'self'", "blob:"],
    "media-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const parts = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`);
  // 本機是 http://localhost，不能強制改成 https
  if (!isDev) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}
