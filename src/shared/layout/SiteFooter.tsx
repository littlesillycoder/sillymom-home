import { cacheLife } from "next/cache";
import { getTranslations } from "next-intl/server";
import { SITE } from "@/shared/config/site";
import { Link } from "@/shared/i18n/navigation";
import { type FooterMode, routeHref } from "@/shared/navigation/routes";
import { Container } from "./Container";
import styles from "./SiteFooter.module.css";

/** 版權年份：快取一天，不讓每次請求都重新計算。 */
async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

type Props = {
  mode: FooterMode;
  /** 簡短頁尾的條款連結：會員連客戶條款、師傅連師傅條款 */
  audience?: "member" | "tech";
};

type FooterLink = { href: string; label: string };

/**
 * 頁尾三種模式（docs/設計補充/設計補充.md 第 2 節）：
 * - full：公開頁。電腦一行版（服務項目・安全機制與審核標準・成為師傅 ｜ 客服中心・服務條款・隱私政策）；手機照設計稿深色三行。
 * - compact：會員、師傅頁。電腦一行版（客戶條款規則或師傅條款・隱私權政策・客服中心）；手機不放。
 * - none：求助流程、視訊、行程追蹤、後台。
 * 公司名稱在 src/shared/config/site.ts。
 */
export async function SiteFooter({ mode, audience = "member" }: Props) {
  if (mode === "none") return null;
  const t = await getTranslations("layout.footer");
  const brand = (await getTranslations("layout"))("brand");
  const copyright = t("copyright", { year: await currentYear(), company: SITE.companyLegalName });

  const groups: FooterLink[][] =
    mode === "full"
      ? [
          [
            { href: routeHref("services"), label: t("services") },
            { href: routeHref("safety"), label: t("safety") },
            { href: routeHref("join"), label: t("join") },
          ],
          [
            { href: routeHref("help"), label: t("help") },
            { href: routeHref("terms"), label: t("terms") },
            { href: routeHref("privacy"), label: t("privacy") },
          ],
        ]
      : [
          [
            audience === "tech"
              ? { href: routeHref("techTerms"), label: t("techTerms") }
              : { href: routeHref("terms"), label: t("customerTerms") },
            { href: routeHref("privacy"), label: t("privacyPolicy") },
            { href: routeHref("help"), label: t("help") },
          ],
        ];

  return (
    <footer aria-label={t("label")} data-footer={mode}>
      {mode === "full" && (
        <div className={styles.mobile}>
          <span className={styles.mobileBrand}>{brand}</span>
          <span>
            <Link href={routeHref("help")}>{t("help")}</Link>
            {" · "}
            <Link href={routeHref("terms")}>{t("customerTerms")}</Link>
            {" · "}
            <Link href={routeHref("privacy")}>{t("privacy")}</Link>
          </span>
          <span>{copyright}</span>
        </div>
      )}
      <div className={styles.desktop}>
        <Container className={styles.row}>
          <span className={styles.brand}>
            <span className={styles.brandName}>{brand}</span>
            <span className={styles.copyright}>{copyright}</span>
          </span>
          <nav aria-label={t("label")} className={styles.links}>
            {groups.map((group, i) => (
              <span key={i} className={styles.links}>
                {i > 0 && <span className={styles.divider} aria-hidden="true" />}
                {group.map((link) => (
                  <Link key={link.label} href={link.href}>
                    {link.label}
                  </Link>
                ))}
              </span>
            ))}
          </nav>
        </Container>
      </div>
    </footer>
  );
}
