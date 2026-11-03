"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";
import styles from "./Dialog.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** 關閉按鈕的說明（從語言檔來）。 */
  closeLabel: string;
  children: ReactNode;
};

/**
 * 對話框：瀏覽器原生 <dialog>（showModal），會鎖住背景、Esc 可關閉、焦點留在對話框裡。
 * 手機從下方滑出，電腦置中。
 */
export function Dialog({ open, onClose, title, closeLabel, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        // 點背景（對話框外）關閉
        if (e.target === ref.current) onClose();
      }}
    >
      <div className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <button type="button" className={styles.close} aria-label={closeLabel} onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <div className={styles.body}>{children}</div>
    </dialog>
  );
}
