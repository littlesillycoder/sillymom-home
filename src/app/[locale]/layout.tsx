import "../globals.css";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/shared/i18n/routing";

const HTML_LANG = { "zh-TW": "zh-Hant-TW", en: "en" } as const;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// 語言用 next/root-params 讀取：語言是最上層的參數，所有頁面共用，
// 不會讓頁面標題等到請求時才產生（Next.js 16 快速顯示的要求）。
async function currentLocale() {
  const locale = await rootLocale();
  // 資安：只接受設定好的語言，其他一律 404。
  if (!hasLocale(routing.locales, locale)) notFound();
  return locale;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  const t = await getTranslations({ locale, namespace: "common" });
  return { title: t("siteName") };
}

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await currentLocale();
  setRequestLocale(locale);

  return (
    <html lang={HTML_LANG[locale]}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
