import type { ComponentProps } from "react";
import { Link } from "@/shared/i18n/navigation";
import styles from "./TextLink.module.css";

type Props = Omit<ComponentProps<typeof Link>, "className">;

/** 單獨一行的文字連結（靠右）。 */
export function EndLink(props: Props) {
  return (
    <span className={styles.end}>
      <Link {...props} />
    </span>
  );
}

/** 「← 回…」返回連結（靠左上）。文字從語言檔來，例如「回我的家與安全設定」。 */
export function BackLink({ children, ...rest }: Props) {
  return (
    <Link className={styles.back} {...rest}>
      {/* 照設計稿用「←」符號，螢幕閱讀器不唸 */}
      <span aria-hidden="true">←</span>
      {children}
    </Link>
  );
}
