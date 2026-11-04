import "@/shared/ui/base.css";
import type { Metadata } from "next";
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

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await initRequestLocale();

  return (
    <html lang={HTML_LANG[locale]} className={notoSansTC.variable}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
