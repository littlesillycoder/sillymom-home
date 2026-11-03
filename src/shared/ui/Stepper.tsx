import type { ReactNode } from "react";
import styles from "./Stepper.module.css";

type Props = {
  /** 這一步的名稱，例如「確認與付款」 */
  title: ReactNode;
  current: number;
  total: number;
  /** 「步驟 4／4」這類文字（從語言檔來） */
  progressLabel: ReactNode;
  /** 「下一步：視訊」這類文字（選填） */
  nextLabel?: ReactNode;
  /** 整個步驟列的說明（從語言檔來），例如「求助步驟」 */
  ariaLabel: string;
};

/** 步驟列：標題、步驟數、下一步、進度條。 */
export function Stepper({ title, current, total, progressLabel, nextLabel, ariaLabel }: Props) {
  const percent = Math.min(100, Math.max(0, (current / total) * 100));
  return (
    <div className={styles.stepper} aria-label={ariaLabel} role="group">
      <span className={styles.title}>{title}</span>
      <div className={styles.meta}>
        <span>{progressLabel}</span>
        {nextLabel && <span>{nextLabel}</span>}
      </div>
      <div
        className={styles.bar}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={current}
      >
        <span className={styles.fill} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
