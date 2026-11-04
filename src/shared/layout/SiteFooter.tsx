import { cacheLife } from "next/cache";
import { getTranslations } from "next-intl/server";
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

/** 頁尾三種模式（docs/設計補充/設計補充.md 第 2 節）：full、compact、none。 */
export async function SiteFooter({ mode, audience = "member" }: Props) {
  if (mode === "none") return null;
  const t = await getTranslations("layout.footer");

  if (mode === "compact") {
    // 只在 768 以上顯示（手機的選單裡已有條款和客服）
    return (
      <footer className={styles.compact} aria-label={t("label")} data-footer="compact">
        <Container>
          {audience === "tech" ? (
            <Link href={routeHref("techTerms")}>{t("techTerms")}</Link>
          ) : (
            <Link href={routeHref("terms")}>{t("customerTerms")}</Link>
          )}
          {" ・ "}
          <Link href={routeHref("privacy")}>{t("privacyPolicy")}</Link>
          {" ・ "}
          <Link href={routeHref("help")}>{t("help")}</Link>
          {" ・ "}
          <span>{t("brandShort")}</span>
        </Container>
      </footer>
    );
  }

  const brand = (await getTranslations("layout"))("brand");
  const copyright = t("copyright", { year: await currentYear(), company: t("company") });
  const columns = [
    {
      title: t("services"),
      links: [
        { href: routeHref("serviceCategory", { category: "plumbing" }), label: t("plumbing") },
        { href: routeHref("serviceCategory", { category: "aircon" }), label: t("aircon") },
        { href: routeHref("serviceCategory", { category: "appliance" }), label: t("appliance") },
      ],
    },
    {
      title: t("about"),
      links: [
        { href: routeHref("safety"), label: t("safety") },
        { href: `${routeHref("safety")}#standards`, label: t("standards") },
        { href: routeHref("join"), label: t("join") },
      ],
    },
    {
      title: t("support"),
      links: [
        { href: routeHref("help"), label: t("help") },
        { href: routeHref("terms"), label: t("terms") },
        { href: routeHref("privacy"), label: t("privacy") },
      ],
    },
  ];

  return (
    <footer className={styles.full} aria-label={t("label")} data-footer="full">
      <div className={styles.fullMobile}>
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
      <Container className={styles.fullDesktop}>
        <div className={styles.desktopBrand}>
          <span className={styles.desktopBrandName}>{brand}</span>
          <span>{copyright}</span>
        </div>
        <div className={styles.columns}>
          {columns.map((column) => (
            <div key={column.title} className={styles.column}>
              <span className={styles.columnTitle}>{column.title}</span>
              {column.links.map((link) => (
                <Link key={link.label} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </Container>
    </footer>
  );
}
