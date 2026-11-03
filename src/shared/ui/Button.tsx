import type { ComponentProps, ReactNode } from "react";
import { Link } from "@/shared/i18n/navigation";
import styles from "./Button.module.css";

export const BUTTON_VARIANTS = [
  "primary",
  "primaryBlue",
  "secondary",
  "book",
  "outline",
  "quiet",
  "danger",
  "dangerSecondary",
] as const;
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];
export type ButtonSize = "lg" | "md" | "sm";

type StyleProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
};

function classes({ variant = "primary", size = "md", fullWidth }: Omit<StyleProps, "children">) {
  return [styles.button, styles[variant], styles[size], fullWidth && styles.fullWidth]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = StyleProps & Omit<ComponentProps<"button">, "className" | "children">;

/** 按鈕。字一律 15px 粗體；尺寸 大 48／中 44／小 36。 */
export function Button({ variant, size, fullWidth, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={classes({ variant, size, fullWidth })} {...rest} />;
}

type ButtonLinkProps = StyleProps & Omit<ComponentProps<typeof Link>, "className" | "children">;

/** 長得像按鈕的站內連結（自動帶語言）。 */
export function ButtonLink({ variant, size, fullWidth, ...rest }: ButtonLinkProps) {
  return <Link className={classes({ variant, size, fullWidth })} {...rest} />;
}
