import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import styles from "./Alert.module.css";

export type AlertTone = "info" | "warning" | "success" | "danger";

const ICONS: Record<AlertTone, IconName> = {
  info: "shield",
  warning: "clock",
  success: "checkCircle",
  danger: "warning",
};

type Props = { tone?: AlertTone; title?: ReactNode; children: ReactNode; icon?: boolean };

/** 提示框：藍（資訊）、黃（提醒）、綠（完成）、紅（危險）。紅色會立刻讓螢幕閱讀器讀出。 */
export function Alert({ tone = "info", title, children, icon = true }: Props) {
  return (
    <div
      className={`${styles.alert} ${styles[tone]}`}
      role={tone === "danger" ? "alert" : "status"}
    >
      {icon && <Icon name={ICONS[tone]} size={20} />}
      <div className={styles.content}>
        {title && <span className={styles.title}>{title}</span>}
        <span>{children}</span>
      </div>
    </div>
  );
}
