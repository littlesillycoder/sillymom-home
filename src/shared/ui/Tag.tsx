import type { ReactNode } from "react";
import { Icon } from "./Icon";
import styles from "./Tag.module.css";

export const TAG_TONES = [
  "female",
  "male",
  "verified",
  "success",
  "info",
  "neutral",
  "warning",
  "danger",
  "highlight",
  "urgent",
  "attention",
] as const;
export type TagTone = (typeof TAG_TONES)[number];

/** 標籤。性別用 female／male；驗證徽章用 verified（前面有打勾）。空的標籤不顯示。 */
export function Tag({ tone = "neutral", children }: { tone?: TagTone; children: ReactNode }) {
  return (
    <span className={`${styles.tag} ${styles[tone]}`}>
      {tone === "verified" && <Icon name="check" size={16} />}
      {children}
    </span>
  );
}
