import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/shared/i18n/navigation";
import { type RouteKey, routeHref } from "@/shared/navigation/routes";
import { Icon, type IconName } from "@/shared/ui/Icon";
import styles from "./AdminShell.module.css";

export type AdminNavKey = "home" | "technicians" | "disputes" | "members" | "finance" | "settings";

const ITEMS: { key: AdminNavKey; route: RouteKey; icon: IconName }[] = [
  { key: "home", route: "admin", icon: "adminHome" },
  { key: "technicians", route: "adminTechnicians", icon: "adminReview" },
  { key: "disputes", route: "adminDisputes", icon: "adminDisputes" },
  { key: "members", route: "adminMembers", icon: "adminMembers" },
  { key: "finance", route: "adminFinance", icon: "adminFinance" },
  { key: "settings", route: "adminSettings", icon: "adminSettings" },
];

type Props = {
  current?: AdminNavKey;
  /** 待處理件數，例如 { technicians: 5, disputes: 3 } */
  pending?: Partial<Record<AdminNavKey, number>>;
  /** 選單下方的管理員名稱與角色（已翻譯），例如「王小明 · 審核員」 */
  adminLabel?: string;
  children: ReactNode;
};

/**
 * 後台版面：1100 以上 240 寬文字選單；1099 以下收成 72 寬圖示選單（滑鼠移上去或 focus 顯示全名）。
 * 每個項目都有 aria-label 全名（含待處理件數）。
 */
export async function AdminShell({ current, pending = {}, adminLabel, children }: Props) {
  const t = await getTranslations("layout");
  return (
    <div className={styles.shell}>
      <nav aria-label={t("admin.nav")} className={styles.sidebar} data-testid="admin-sidebar">
        <Link href={routeHref("admin")} className={styles.brand} aria-label={t("adminTagline")}>
          <span className={styles.logo}>
            <Icon name="shieldCheck" size={22} />
          </span>
          <span className={styles.brandText}>
            <span className={styles.brandName}>{t("brand")}</span>
            <span className={styles.brandSub}>{t("adminTagline")}</span>
          </span>
        </Link>
        {ITEMS.map((item) => {
          const label = t(`admin.${item.key}`);
          const count = pending[item.key] ?? 0;
          const fullLabel = count > 0 ? t("admin.withPending", { label, count }) : label;
          return (
            <Link
              key={item.key}
              href={routeHref(item.route)}
              className={styles.item}
              aria-current={item.key === current ? "page" : undefined}
              aria-label={fullLabel}
            >
              <span className={styles.icon}>
                <Icon name={item.icon} />
              </span>
              <span className={styles.label}>{label}</span>
              {count > 0 && (
                <span className={styles.badge} aria-hidden="true">
                  {count}
                </span>
              )}
              <span className={styles.tooltip} aria-hidden="true">
                {label}
              </span>
            </Link>
          );
        })}
        <div className={styles.footer}>
          {adminLabel && (
            <>
              {adminLabel}
              <br />
            </>
          )}
          {t("admin.auditNote")}
        </div>
      </nav>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
