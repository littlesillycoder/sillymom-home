import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { getCspMode } from "@/shared/config/env";
import { localeFromAcceptLanguage } from "@/shared/i18n/accept-language";
import { routing } from "@/shared/i18n/routing";
import { buildCsp, cspHeaderName, generateNonce } from "@/shared/security/csp";
import { NONCE_REQUEST_HEADER } from "@/shared/security/nonce";

const intl = createMiddleware(routing);

/**
 * 每個頁面請求都會經過這裡：
 *
 * 1. CSP（#6）：每次產生新的 nonce。
 *    - 放進請求標頭 content-security-policy：Next.js 會讀它，把 nonce 加到自己的 <script>。
 *    - 放進請求標頭 x-nonce：我們自己的 <Script>（例如 Turnstile）用 getNonce() 讀。
 *    - 回應標頭依 CSP_MODE 用 Content-Security-Policy（擋下）或 ...-Report-Only（只回報）。
 *    - 帶 nonce 的頁面不能被快取（Cache-Control: private, no-store），否則別人會拿到同一個 nonce。
 *
 * 2. 登入狀態（#11）：有 Supabase 的登入 cookie 時，先更新登入狀態（過期就換新），
 *    新的 cookie 同時交給這次的頁面和瀏覽器。這裡只更新狀態，**不是**頁面保護的關卡：
 *    會員、師傅、後台頁面在伺服器端用 requireAccess() 檢查（proxy 有被繞過的前例）。
 *
 * 3. 語言轉址（docs/設計補充/設計補充.md 第 1 節）：
 *    - 自己切換過語言（cookie）→ 用 cookie。
 *    - 第一次進網站 → 看瀏覽器語言：中文用繁中，其他用英文；沒送用繁中。
 *    Accept-Language 先由程式自己整理成 zh-TW 或 en，再交給 next-intl（資安：不讓超長或亂寫的標頭進去）。
 *    不在語言網址列表的路徑（例如 /xx/...）會被當成沒有語言，轉到 /<語言>/xx/... 再顯示 404。
 */
type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

/** 有登入 cookie 時更新登入狀態，回傳要寫給瀏覽器的 cookie。 */
async function refreshSession(request: NextRequest): Promise<CookieToSet[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return [];
  if (!request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) return [];

  const pending: CookieToSet[] = [];
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        pending.push(...cookies);
      },
    },
  });
  try {
    await supabase.auth.getClaims();
  } catch {
    // Supabase 連不上：照舊處理頁面，頁面的 requireAccess() 會再檢查
  }
  return pending;
}

export default async function proxy(request: NextRequest) {
  const sessionCookies = await refreshSession(request);

  const nonce = generateNonce();
  const csp = buildCsp({
    nonce,
    isDev: process.env.NODE_ENV === "development",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });

  const headers = new Headers(request.headers);
  headers.set("accept-language", localeFromAcceptLanguage(request.headers.get("accept-language")));
  headers.set(NONCE_REQUEST_HEADER, nonce);
  headers.set("content-security-policy", csp);
  if (sessionCookies.length > 0) headers.set("cookie", request.cookies.toString());

  const response = intl(new NextRequest(request, { headers }));
  response.headers.set(cspHeaderName(getCspMode()), csp);
  response.headers.set("Cache-Control", "private, no-store");
  sessionCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}

export const config = {
  // 不經過這裡：Next.js 內部檔案、有副檔名的檔案、/health、/internal/...（補處理網址）
  // 這些都不是 HTML 頁面，不需要 CSP；其他安全標頭由 next.config.ts 加到所有網址。
  matcher: ["/((?!_next|_vercel|health|internal|.*\\..*).*)"],
};
