import "@/shared/ui/base.css";
import type { Metadata } from "next";
import { connection } from "next/server";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { initRequestLocale } from "@/shared/i18n/request-locale";
import { routing } from "@/shared/i18n/routing";
import { notoSansTC } from "@/shared/ui/fonts";

const HTML_LANG = { "zh-TW": "zh-Hant-TW", en: "en" } as const;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// 語言用 next/root-params 讀取（initRequestLocale）：語言是最上層的參數，所有頁面共用，
// 不會讓頁面標題等到請求時才產生（Next.js 16 快速顯示的要求）。
export async function generateMetadata(): Promise<Metadata> {
  const locale = await initRequestLocale();
  const t = await getTranslations({ locale, namespace: "common" });
  return { title: t("siteName") };
}

/**
 * CSP nonce（#6）：每個頁面都要在請求時產生，Next.js 才能把這次的 nonce 加到 <script> 上。
 * 事先產生好的頁面（靜態、部分預先產生）沒有請求，就沒有 nonce，會被 CSP 擋下。
 * - connection()：告訴 Next.js 這裡要等請求進來才能產生。
 * - instant = false：允許整個網站沒有事先產生的外框（Next.js 會檢查每頁都有外框，這裡刻意關掉）。
 * 代價：頁面不能放在 CDN 快取，每次都由伺服器產生（使用者已同意，見 #6 執行方式 A）。
 */
export const instant = false;

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  await connection();
  const locale = await initRequestLocale();

  return (
    <html lang={HTML_LANG[locale]} className={notoSansTC.variable}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
