"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "./navigation";
import { routing } from "./routing";

/**
 * 語言切換。只替換目前網址的語言部分，不接受外部傳入的網址（避免被當成轉址跳板）。
 * 擺放位置在「頁首」issue 照設計稿決定。
 */
export function LanguageSwitcher() {
  const t = useTranslations("languageSwitcher");
  const current = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t("label")}>
      {routing.locales.map((locale) =>
        locale === current ? (
          <span key={locale} aria-current="true">
            {t(locale)}
          </span>
        ) : (
          <Link key={locale} href={pathname} locale={locale} hrefLang={locale}>
            {t(locale)}
          </Link>
        ),
      )}
    </nav>
  );
}
