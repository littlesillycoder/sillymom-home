import { notFound } from "next/navigation";
import { initRequestLocale } from "@/shared/i18n/request-locale";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { isDevToolsEnabled } from "@/shared/config/env";
import { Link } from "@/shared/i18n/navigation";
import { Container, PageShell } from "@/shared/layout";
import type { FooterMode } from "@/shared/navigation/routes";
import { BackLink } from "@/shared/ui";
import styles from "./page.module.css";

export const instant = false;

const HEADERS = ["guest", "member", "tech"] as const;
const FOOTERS: FooterMode[] = ["full", "compact", "none"];
// 範例：師傅自己的公開頁 UUID
const SAMPLE_TECH_ID = "3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b";

/** 版面展示頁：切換頁首、頁尾。只在開發和 PR 預覽環境開啟。 */
export default async function DevLayoutPage({ searchParams }: PageProps<"/[locale]/dev/layout">) {
  await connection();
  await initRequestLocale();
  if (!isDevToolsEnabled()) notFound();
  const t = await getTranslations("devLayout");
  const query = await searchParams;
  // 只接受清單上的值（資安：不把網址參數原樣用在畫面上）
  const header = HEADERS.find((h) => h === query.header) ?? "guest";
  const footer = FOOTERS.find((f) => f === query.footer) ?? "full";

  const headerProps =
    header === "member"
      ? ({
          variant: "member",
          current: "dashboard",
          unreadNotifications: true,
          user: { displayName: t("sampleMember"), statusText: t("sampleMemberStatus") },
        } as const)
      : header === "tech"
        ? ({
            variant: "tech",
            current: "home",
            unreadMessages: true,
            publicProfileId: SAMPLE_TECH_ID,
            user: { displayName: t("sampleTech"), statusText: t("sampleTechStatus") },
          } as const)
        : ({ variant: "guest" } as const);

  return (
    <PageShell header={headerProps} footer={footer}>
      <Container className={styles.controls}>
        <BackLink href="/dev/ui">{t("back")}</BackLink>
        <h1>{t("title")}</h1>
        <p>{t("description")}</p>
        <div className={styles.row}>
          <span className={styles.label}>{t("header")}</span>
          {HEADERS.map((h) => (
            <Link
              key={h}
              href={{ pathname: "/dev/layout", query: { header: h, footer } }}
              className={styles.option}
              aria-current={h === header}
            >
              {t(h)}
            </Link>
          ))}
        </div>
        <div className={styles.row}>
          <span className={styles.label}>{t("footer")}</span>
          {FOOTERS.map((f) => (
            <Link
              key={f}
              href={{ pathname: "/dev/layout", query: { header, footer: f } }}
              className={styles.option}
              aria-current={f === footer}
            >
              {t(f)}
            </Link>
          ))}
          <Link href="/dev/layout/admin" className={styles.option}>
            {t("admin")}
          </Link>
        </div>
        <div className={styles.placeholder}>{t("content")}</div>
      </Container>
    </PageShell>
  );
}
