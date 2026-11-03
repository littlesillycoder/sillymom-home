import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { isDevToolsEnabled } from "@/shared/config/env";
import { LanguageSwitcher } from "@/shared/i18n";
import {
  Alert,
  BackLink,
  Button,
  BUTTON_VARIANTS,
  Card,
  CardInner,
  EndLink,
  Icon,
  ICON_NAMES,
  Stepper,
  Tag,
  TAG_TONES,
  TextArea,
  TextField,
  type ButtonSize,
} from "@/shared/ui";
import { Interactive } from "./Interactive";
import styles from "./page.module.css";

// 開發用頁面：每次請求才判斷環境（不預先產生）。
export const instant = false;

const COLOR_TOKENS = [
  "--color-accent",
  "--color-accent-soft",
  "--color-denim",
  "--color-denim-soft",
  "--color-link",
  "--color-bg",
  "--color-surface",
  "--color-surface-muted",
  "--color-border",
  "--color-border-input",
  "--color-divider",
  "--color-text",
  "--color-text-secondary",
  "--color-text-muted",
  "--color-success",
  "--color-success-soft",
  "--color-check",
  "--color-warning",
  "--color-warning-soft",
  "--color-attention",
  "--color-danger",
  "--color-gender-female",
  "--color-gender-male",
] as const;

const SIZES: ButtonSize[] = ["lg", "md", "sm"];

/** 元件展示頁。只在開發和 PR 預覽環境開啟，展示和正式環境回 404。 */
export default async function DevUiPage() {
  await connection();
  if (!isDevToolsEnabled()) notFound();
  const t = await getTranslations("devUi");

  return (
    <main className={styles.page}>
      <LanguageSwitcher />
      <BackLink href="/dev/i18n">{t("backLink")}</BackLink>
      <h1>{t("title")}</h1>
      <p className={styles.lead}>{t("description")}</p>

      <section className={styles.section}>
        <h2>{t("colors")}</h2>
        <div className={styles.grid}>
          {COLOR_TOKENS.map((token) => (
            <span key={token} className={styles.swatch}>
              <span className={styles.chip} style={{ background: `var(${token})` }} />
              <code>{token}</code>
            </span>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2>{t("buttons")}</h2>
        <div className={styles.grid}>
          {BUTTON_VARIANTS.map((variant) => (
            <Button key={variant} variant={variant} fullWidth>
              {t(`variant.${variant}`)}
            </Button>
          ))}
        </div>
        <p>{t("buttonSizes")}</p>
        <div className={styles.row}>
          {SIZES.map((size) => (
            <Button key={size} size={size}>
              {t(`size.${size}`)}
            </Button>
          ))}
          <Button disabled>{t("disabled")}</Button>
        </div>
      </section>

      <section className={styles.section}>
        <h2>{t("tags")}</h2>
        <div className={styles.row}>
          {TAG_TONES.map((tone) => (
            <Tag key={tone} tone={tone}>
              {t(`tag.${tone}`)}
            </Tag>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2>{t("cards")}</h2>
        <Card>
          <h2>{t("cardTitle")}</h2>
          <CardInner>
            <span className={styles.innerHead}>
              {t("innerTitle")}
              <a href="#">{t("change")}</a>
            </span>
            <span className={styles.success}>{t("innerBody")}</span>
          </CardInner>
        </Card>
        <Card tone="danger">
          <h2>{t("dangerCardTitle")}</h2>
        </Card>
      </section>

      <section className={styles.section}>
        <h2>{t("inputs")}</h2>
        <div className={styles.stack}>
          <TextField
            label={t("nameLabel")}
            placeholder={t("namePlaceholder")}
            hint={t("nameHint")}
          />
          <TextField label={t("phoneLabel")} defaultValue="0912" error={t("phoneError")} />
          <TextField label={t("codeLabel")} kind="code" maxLength={6} />
          <TextField
            label={t("searchLabel")}
            kind="search"
            hideLabel
            placeholder={t("searchPlaceholder")}
          />
          <TextArea label={t("problemLabel")} placeholder={t("problemPlaceholder")} />
        </div>
      </section>

      <Interactive />

      <section className={styles.section}>
        <h2>{t("steppers")}</h2>
        <Stepper
          ariaLabel={t("stepperLabel")}
          title={t("stepTitle")}
          current={4}
          total={4}
          progressLabel={t("stepProgress", { current: 4, total: 4 })}
          nextLabel={t("stepNext")}
        />
        <Stepper
          ariaLabel={t("stepperLabel")}
          title={t("stepTitle")}
          current={2}
          total={4}
          progressLabel={t("stepProgress", { current: 2, total: 4 })}
        />
      </section>

      <section className={styles.section}>
        <h2>{t("alerts")}</h2>
        <div className={styles.stack}>
          <Alert tone="info" title={t("alertInfoTitle")}>
            {t("alertInfo")}
          </Alert>
          <Alert tone="warning">{t("alertWarning")}</Alert>
          <Alert tone="success">{t("alertSuccess")}</Alert>
          <Alert tone="danger" title={t("alertDangerTitle")}>
            {t("alertDanger")}
          </Alert>
        </div>
      </section>

      <section className={styles.section}>
        <h2>{t("links")}</h2>
        <EndLink href="/dev/i18n">{t("endLink")}</EndLink>
      </section>

      <section className={styles.section}>
        <h2>{t("icons")}</h2>
        <div className={styles.icons}>
          {ICON_NAMES.map((name) => (
            <span key={name} className={styles.icon}>
              <Icon name={name} />
              <code>{name}</code>
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
