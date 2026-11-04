import { notFound } from "next/navigation";
import { initRequestLocale } from "@/shared/i18n/request-locale";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { isDevToolsEnabled } from "@/shared/config/env";
import { AdminShell } from "@/shared/layout";
import { BackLink } from "@/shared/ui";
import styles from "../page.module.css";

export const instant = false;

/** 後台版面展示。只在開發和 PR 預覽環境開啟。 */
export default async function DevAdminLayoutPage() {
  await connection();
  await initRequestLocale();
  if (!isDevToolsEnabled()) notFound();
  const t = await getTranslations("devLayout");
  return (
    <AdminShell
      current="home"
      pending={{ technicians: 5, disputes: 3 }}
      adminLabel={t("sampleAdmin")}
    >
      <BackLink href="/dev/layout">{t("back")}</BackLink>
      <h1>{t("admin")}</h1>
      <div className={styles.placeholder}>{t("content")}</div>
    </AdminShell>
  );
}
