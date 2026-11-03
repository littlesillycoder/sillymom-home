import type { ComponentProps } from "react";
import styles from "./Card.module.css";

type Props = Omit<ComponentProps<"section">, "className"> & { tone?: "default" | "danger" };

/** 卡片：圓角 16。 */
export function Card({ tone = "default", ...rest }: Props) {
  return (
    <section className={`${styles.card} ${tone === "danger" ? styles.danger : ""}`} {...rest} />
  );
}

/** 卡片裡的小框：圓角 12。 */
export function CardInner(props: Omit<ComponentProps<"div">, "className">) {
  return <div className={styles.inner} {...props} />;
}
