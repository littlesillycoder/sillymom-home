import { Icon } from "./Icon";
import styles from "./FlowSteps.module.css";

type Props = {
  /** 每一步的名稱（從語言檔來） */
  steps: string[];
  /** 目前第幾步（從 1 開始） */
  current: number;
  /** 整個步驟列的說明，例如「求助步驟」 */
  ariaLabel: string;
};

/**
 * 電腦版的流程步驟（設計稿 SignUp、Checkout 電腦版）：圓圈＋名稱，做完的打勾、目前的藍底。
 * 手機版用 Stepper（進度條）。
 */
export function FlowSteps({ steps, current, ariaLabel }: Props) {
  return (
    <ol className={styles.steps} aria-label={ariaLabel}>
      {steps.map((label, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "current" : "todo";
        return (
          <li
            key={label}
            className={styles.step}
            data-state={state}
            aria-current={state === "current" ? "step" : undefined}
          >
            <span className={styles.circle} aria-hidden="true">
              {state === "done" ? <Icon name="check" size={16} /> : n}
            </span>
            <span className={styles.label}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
