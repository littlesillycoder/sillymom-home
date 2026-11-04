"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "@/shared/i18n/navigation";
import { LanguageSwitcher } from "@/shared/i18n/LanguageSwitcher";
import { Icon } from "@/shared/ui/Icon";
import styles from "./MenuDialog.module.css";

type Props = {
  /** 選單左上角的品牌（Logo、名稱、師傅標籤） */
  brand: ReactNode;
  menuLabel: string;
  closeLabel: string;
  children: ReactNode;
};

/**
 * 手機選單（螢幕寬 1099 以下）：原生 <dialog>，焦點留在選單裡。
 * Esc、點背景、點選單裡的連結、換頁都會關閉。
 * 返回手勢維持瀏覽器本來的行為（不另外加瀏覽紀錄）。
 * 語言切換放在選單最上面、關閉按鈕左邊（docs/設計補充/設計補充.md 第 1 節方案 2）。
 */
export function MenuDialog({ brand, menuLabel, closeLabel, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  // 記住是在哪一頁打開的：換頁之後就自動算關閉（不用在 effect 裡改狀態）
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const setOpen = (value: boolean) => setOpenedOn(value ? pathname : null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        aria-label={menuLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        data-testid="menu-trigger"
      >
        <Icon name="menu" size={26} />
      </button>
      <dialog
        ref={ref}
        className={styles.dialog}
        aria-label={menuLabel}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === ref.current) setOpen(false);
          // 點了選單裡的連結（含語言切換）就關閉
          if ((e.target as HTMLElement).closest("a")) setOpen(false);
        }}
        data-testid="menu-dialog"
      >
        <div className={styles.bar}>
          {brand}
          <span className={styles.barActions}>
            <LanguageSwitcher variant="mobile" />
            <button
              type="button"
              className={styles.trigger}
              aria-label={closeLabel}
              onClick={() => setOpen(false)}
            >
              <Icon name="close" />
            </button>
          </span>
        </div>
        <div className={styles.panel}>{children}</div>
      </dialog>
    </>
  );
}
