import type { ComponentProps } from "react";
import styles from "./Container.module.css";

/** 內容區：左右留白（手機 16px、電腦 5.556%）、2560 以上內容最寬 2240。 */
export function Container({ className, ...rest }: ComponentProps<"div">) {
  return <div className={[styles.container, className].filter(Boolean).join(" ")} {...rest} />;
}
