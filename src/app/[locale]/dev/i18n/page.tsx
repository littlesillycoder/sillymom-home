import { notFound } from "next/navigation";
import { connection } from "next/server";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { getRegion } from "@/shared/config/regions";
import { isDevToolsEnabled } from "@/shared/config/env";
import {
  addMoney,
  formatDateTime,
  formatMoney,
  LanguageSwitcher,
  money,
  routing,
} from "@/shared/i18n";

// 開發用頁面：每次請求才判斷環境（不預先產生），可以等伺服器算完再顯示。
export const instant = false;

// 固定的 UTC 時間，方便對照時區轉換。
const SAMPLE_UTC = "2026-11-03T07:30:00Z";

/** 多語系範例頁。只在開發和 PR 預覽環境開啟，展示和正式環境回 404。 */
export default async function DevI18nPage({ params }: PageProps<"/[locale]/dev/i18n">) {
  await connection();
  if (!isDevToolsEnabled()) notFound();

  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations("devI18n");
  const taipei = { locale, timeZone: getRegion().timeZone };
  const berlin = { locale, timeZone: "Europe/Berlin" };

  const rows: [string, string][] = [
    [t("videoFee"), formatMoney(money("150", "TWD"), locale)],
    [t("largeAmount"), formatMoney(money("1234567", "TWD"), locale)],
    [t("euroWhole"), formatMoney(money("150", "EUR"), locale)],
    [t("euroCents"), formatMoney(money("150.50", "EUR"), locale)],
    [t("decimalSum"), formatMoney(addMoney(money("0.1", "EUR"), money("0.2", "EUR")), locale)],
  ];

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <LanguageSwitcher />
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>

      <h2>{t("textSection")}</h2>
      <p>{t("greeting")}</p>

      <h2>{t("moneySection")}</h2>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <h2>{t("dateSection")}</h2>
      <dl>
        <dt>{t("sourceUtc")}</dt>
        <dd>
          <code>{SAMPLE_UTC}</code>
        </dd>
        <dt>{t("taipei")}</dt>
        <dd>{formatDateTime(SAMPLE_UTC, taipei)}</dd>
        <dt>{t("berlin")}</dt>
        <dd>{formatDateTime(SAMPLE_UTC, berlin)}</dd>
      </dl>
    </main>
  );
}
