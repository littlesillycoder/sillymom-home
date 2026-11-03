import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "@/shared/i18n/routing";

const intl = createMiddleware(routing);

/**
 * 語言轉址：沒有語言的網址轉到使用者選過的語言（cookie），沒選過就用繁中。
 * 先拿掉 Accept-Language，不照瀏覽器語言自動切換（英文目前只是占位）。
 * 不在語言網址列表的路徑（例如 /xx/...）會被當成沒有語言，轉到 /zh-TW/xx/... 再顯示 404。
 */
export default function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.delete("accept-language");
  return intl(new NextRequest(request, { headers }));
}

export const config = {
  // 不經過語言轉址：Next.js 內部檔案、有副檔名的檔案、/health、/internal/...（補處理網址）
  matcher: ["/((?!_next|_vercel|health|internal|.*\\..*).*)"],
};
