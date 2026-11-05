import "server-only";
import { type AppEnv, getAppEnv, getTurnstileSecretKey } from "@/shared/config/env";
import { log } from "@/shared/log";

/**
 * Cloudflare Turnstile（防機器人）的伺服器端驗證（#6）。
 *
 * 登入、送驗證碼不用這個：由 Supabase Auth 內建的 Turnstile 支援驗證（supabase/config.toml [auth.captcha]）。
 * 這裡給其他表單用（例如申訴）。
 *
 * 資安：
 * - token 只能用一次、5 分鐘內有效，由 Cloudflare 判斷。
 * - 檢查用途（action）和網站名稱（hostname），避免別的表單或別的網站拿到的 token 被拿來用。
 * - Cloudflare 沒回應、逾時、回傳格式不對 → 一律當作不通過（擋下，不放行）。
 * - 測試金鑰的結果在正式環境一律不通過（正式環境本來就不能設定測試金鑰，這裡再擋一次）。
 */

export const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export { TURNSTILE_FORM_FIELD } from "./turnstile-constants";
/** Cloudflare 的 token 最長 2048 字元 */
const MAX_TOKEN_LENGTH = 2048;
/** 用途代號：英數、_、-，最多 32 字元（Cloudflare 的限制） */
export const TURNSTILE_ACTION_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const DEFAULT_TIMEOUT_MS = 5000;

export type TurnstileFailure =
  | "missing-token"
  | "invalid-token"
  | "action-mismatch"
  | "hostname-mismatch"
  | "testing-key-in-production"
  | "unavailable";

export type TurnstileResult = { ok: true } | { ok: false; reason: TurnstileFailure };

export type VerifyTurnstileInput = {
  /** 表單裡 cf-turnstile-response 的值 */
  token: FormDataEntryValue | string | null | undefined;
  /** 這個表單的用途代號，要和畫面元件的 action 一樣 */
  expectedAction: string;
  /** 這次請求的網站名稱，例如 new URL(request.url).hostname */
  expectedHostname: string;
  /** 使用者 IP（Cloudflare 的 CF-Connecting-IP），可省略 */
  remoteIp?: string | null;
  // 以下給測試用
  secretKey?: string;
  appEnv?: AppEnv;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

type SiteverifyResponse = {
  success?: unknown;
  action?: unknown;
  hostname?: unknown;
  "error-codes"?: unknown;
  metadata?: { result_with_testing_key?: unknown };
};

export async function verifyTurnstile(input: VerifyTurnstileInput): Promise<TurnstileResult> {
  const result = await verify(input);
  if (!result.ok)
    log.warn("turnstile.failed", { reason: result.reason, action: input.expectedAction });
  return result;
}

async function verify({
  token,
  expectedAction,
  expectedHostname,
  remoteIp,
  secretKey,
  appEnv = getAppEnv(),
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: VerifyTurnstileInput): Promise<TurnstileResult> {
  if (!TURNSTILE_ACTION_PATTERN.test(expectedAction)) {
    throw new Error("Turnstile 的 action 格式不對（英數、_、-，最多 32 字元）");
  }
  if (typeof token !== "string" || token.length === 0) return fail("missing-token");
  if (token.length > MAX_TOKEN_LENGTH) return fail("invalid-token");

  const body = new URLSearchParams({
    secret: secretKey ?? getTurnstileSecretKey(appEnv),
    response: token,
  });
  if (remoteIp) body.set("remoteip", remoteIp);

  let data: SiteverifyResponse;
  try {
    const res = await fetchImpl(SITEVERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return fail("unavailable");
    data = (await res.json()) as SiteverifyResponse;
  } catch {
    return fail("unavailable");
  }
  if (data === null || typeof data !== "object") return fail("unavailable");
  if (data.success !== true) return fail("invalid-token");

  // 測試金鑰：Cloudflare 回傳的 hostname 是 example.com、沒有 action，所以不檢查這兩項。
  if (data.metadata?.result_with_testing_key === true) {
    return appEnv === "production" ? fail("testing-key-in-production") : { ok: true };
  }
  if (data.action !== expectedAction) return fail("action-mismatch");
  if (data.hostname !== expectedHostname) return fail("hostname-mismatch");
  return { ok: true };
}

function fail(reason: TurnstileFailure): TurnstileResult {
  return { ok: false, reason };
}
