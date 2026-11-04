import type { ComponentProps, ReactNode } from "react";
import styles from "./Checkbox.module.css";

type Props = Omit<ComponentProps<"input">, "type" | "className"> & {
  label: ReactNode;
  description?: ReactNode;
};

/** 勾選框（瀏覽器原生 checkbox，鍵盤和螢幕閱讀器都能用）。文字不會跑到勾選框下面。 */
export function Checkbox({ label, description, ...rest }: Props) {
  return (
    <label className={styles.row}>
      <input type="checkbox" className={styles.box} {...rest} />
      <span className={styles.text}>
        <span className={styles.title}>{label}</span>
        {description && <span className={styles.description}>{description}</span>}
      </span>
    </label>
  );
}
