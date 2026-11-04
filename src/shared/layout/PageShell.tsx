import type { ComponentProps, ReactNode } from "react";
import type { FooterMode } from "@/shared/navigation/routes";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import styles from "./PageShell.module.css";

type Props = {
  header: ComponentProps<typeof SiteHeader>;
  footer: FooterMode;
  children: ReactNode;
};

/** 一般頁面的外框：頁首、內容、頁尾（頁尾模式由頁面指定）。 */
export function PageShell({ header, footer, children }: Props) {
  return (
    <div className={styles.shell}>
      <SiteHeader {...header} />
      <main className={styles.main}>{children}</main>
      <SiteFooter mode={footer} audience={header.variant === "tech" ? "tech" : "member"} />
    </div>
  );
}
