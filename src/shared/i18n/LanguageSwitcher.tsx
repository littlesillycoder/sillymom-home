"use client";

import { useLocale, useTranslations } from "next-intl";
import { Icon } from "@/shared/ui/Icon";
import { Link, usePathname } from "./navigation";
import { routing } from "./routing";
import styles from "./LanguageSwitcher.module.css";

type Props = {
  /** desktop：頁首右邊；mobile：手機選單最上面（docs/設計補充/設計補充.md 第 1 節） */
  variant: "desktop" | "mobile";
};

/**
 * 語言切換：顯示「另一種語言」，點了停在同一頁。
 * 資安：只替換目前網址的語言部分，不接受外部傳入的網址（避免被當成轉址跳板）。
 */
export function LanguageSwitcher({ variant }: Props) {
  const t = useTranslations("languageSwitcher");
  const current = useLocale();
  const pathname = usePathname();
  const targets = routing.locales.filter((locale) => locale !== current);

  return (
    <>
      {targets.map((locale) => (
        <Link
          key={locale}
          href={pathname}
          locale={locale}
          hrefLang={locale}
          lang={locale}
          aria-label={t(`aria.${locale}`)}
          className={`${styles.link} ${styles[variant]}`}
        >
          <Icon name="globe" size={variant === "mobile" ? 16 : 18} />
          {t(`${variant}.${locale}`)}
        </Link>
      ))}
    </>
  );
}
