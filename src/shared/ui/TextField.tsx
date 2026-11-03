import { useId, type ComponentProps, type ReactNode } from "react";
import styles from "./TextField.module.css";

type Common = {
  label: ReactNode;
  hint?: ReactNode;
  /** 錯誤訊息（從語言檔來）。有值時輸入框變紅框，並讓螢幕閱讀器讀到。 */
  error?: ReactNode;
  /** 視覺上隱藏標題（例如搜尋框），但螢幕閱讀器仍讀得到。 */
  hideLabel?: boolean;
};

type InputProps = Common &
  Omit<ComponentProps<"input">, "className" | "id"> & { kind?: "text" | "code" | "search" };

function Frame({
  id,
  label,
  hint,
  error,
  hideLabel,
  children,
}: Common & { id: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={hideLabel ? "visually-hidden" : styles.label}>
        {label}
      </label>
      {children}
      {hint && !error && (
        <span id={`${id}-hint`} className={styles.hint}>
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

/** 輸入框：一般 44 高；驗證碼 kind="code" 48 高；搜尋 kind="search" 40 高。 */
export function TextField({ label, hint, error, hideLabel, kind = "text", ...rest }: InputProps) {
  const id = useId();
  const kindClass = kind === "code" ? styles.code : kind === "search" ? styles.search : "";
  return (
    <Frame id={id} label={label} hint={hint} error={error} hideLabel={hideLabel}>
      <input
        id={id}
        type={kind === "search" ? "search" : kind === "code" ? "text" : "text"}
        inputMode={kind === "code" ? "numeric" : undefined}
        autoComplete={kind === "code" ? "one-time-code" : undefined}
        className={`${styles.input} ${kindClass}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...rest}
      />
    </Frame>
  );
}

type TextAreaProps = Common & Omit<ComponentProps<"textarea">, "className" | "id">;

export function TextArea({ label, hint, error, hideLabel, ...rest }: TextAreaProps) {
  const id = useId();
  return (
    <Frame id={id} label={label} hint={hint} error={error} hideLabel={hideLabel}>
      <textarea
        id={id}
        className={styles.textarea}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...rest}
      />
    </Frame>
  );
}
