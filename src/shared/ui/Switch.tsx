"use client";

import type { ReactNode } from "react";
import styles from "./Switch.module.css";

type Props = {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

/** 開關（role="switch"，整列都可以點）。 */
export function Switch({ label, checked, onChange, disabled }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={styles.row}
      onClick={() => onChange(!checked)}
    >
      <span>{label}</span>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.knob} />
      </span>
    </button>
  );
}
