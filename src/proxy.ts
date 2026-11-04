import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { localeFromAcceptLanguage } from "@/shared/i18n/accept-language";
import { routing } from "@/shared/i18n/routing";

const intl = createMiddleware(routing);

/**
 * 語言轉址（docs/設計補充/設計補充.md 第 1 節）：
 * - 自己切換過語言（cookie）→ 用 cookie。
 * - 第一次進網站 → 看瀏覽器語言：中文用繁中，其他用英文；沒送用繁中。
 * Accept-Language 先由程式自己整理成 zh-TW 或 en，再交給 next-intl（資安：不讓超長或亂寫的標頭進去）。
 * 不在語言網址列表的路徑（例如 /xx/...）會被當成沒有語言，轉到 /<語言>/xx/... 再顯示 404。
 */
export default function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("accept-language", localeFromAcceptLanguage(request.headers.get("accept-language")));
  return intl(new NextRequest(request, { headers }));
}

export const config = {
  // 不經過語言轉址：Next.js 內部檔案、有副檔名的檔案、/health、/internal/...（補處理網址）
  matcher: ["/((?!_next|_vercel|health|internal|.*\\..*).*)"],
};
