import { getLocale, getTranslations } from "next-intl/server";
import { getRegion, isLocale } from "@/shared/config/regions";
import { Link } from "@/shared/i18n/navigation";
import { routeHref } from "@/shared/navigation/routes";
import { Tag } from "@/shared/ui/Tag";
import { availabilityParts } from "../availability";
import type { Credential, TechCardData, TechStatus } from "../types";
import styles from "./parts.module.css";

export function profileHref(tech: Pick<TechCardData, "id">) {
  return routeHref("technician", { id: tech.id });
}

/** 頭像：稱呼的第一個字。link：頭像本身連到個人頁。 */
export function TechAvatar({
  tech,
  size,
  online,
  link,
  label,
}: {
  tech: TechCardData;
  size: number;
  online?: boolean;
  link?: boolean;
  label?: string;
}) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) };
  const content = (
    <>
      {Array.from(tech.displayName)[0]}
      {online && <span className={styles.onlineDot} />}
    </>
  );
  return link ? (
    <Link href={profileHref(tech)} className={styles.avatar} style={style} aria-label={label}>
      {content}
    </Link>
  ) : (
    <span className={styles.avatar} style={style} aria-hidden="true">
      {content}
    </span>
  );
}

export async function GenderTag({ gender }: { gender: TechCardData["gender"] }) {
  const t = await getTranslations("technician");
  return <Tag tone={gender}>{t(`gender.${gender}`)}</Tag>;
}

export async function ServicesTag({ count }: { count: number }) {
  const t = await getTranslations("technician");
  return <Tag tone="info">{t("services", { count })}</Tag>;
}

/** 頭像下方：「4.8 / 5」「12 則評價」；還沒有評價顯示「新師傅」。 */
export async function RatingBlock({ tech }: { tech: TechCardData }) {
  const t = await getTranslations("technician");
  return (
    <span className={styles.rating}>
      {tech.rating === null ? (
        <span className={styles.reviews}>{t("noRating")}</span>
      ) : (
        <>
          <span className={styles.ratingValue}>
            {tech.rating.toFixed(1)} <span className={styles.ratingOutOf}>{t("ratingOutOf")}</span>
          </span>
          <span className={styles.reviews}>{t("reviews", { count: tech.reviewCount })}</span>
        </>
      )}
    </span>
  );
}

/** 一行評分：「★ 4.8 · 12 則評價」（手機詳細卡）。 */
export async function ratingLine(tech: TechCardData): Promise<string> {
  const t = await getTranslations("technician");
  return tech.rating === null
    ? t("noRating")
    : t("ratingLine", { rating: tech.rating.toFixed(1), count: tech.reviewCount });
}

/** 「在線中」「視訊中」「可視訊：今天 20:00 後」。now：現在時間（由頁面傳入）。 */
export async function statusLabel(status: TechStatus, now: Date): Promise<string> {
  const t = await getTranslations("technician.status");
  if (status.kind !== "later") return t(status.kind);
  const raw = await getLocale();
  const locale = isLocale(raw) ? raw : getRegion().defaultLocale;
  const parts = availabilityParts(status.at, now, { locale, timeZone: getRegion().timeZone });
  if (parts.day === "today") return t("laterToday", { time: parts.time });
  if (parts.day === "tomorrow") return t("laterTomorrow", { time: parts.time });
  return t("laterDate", { date: parts.date, time: parts.time });
}

export async function StatusPill({
  status,
  now,
  className,
}: {
  status: TechStatus;
  now: Date;
  className?: string;
}) {
  return (
    <span className={[styles.status, styles[status.kind], className].filter(Boolean).join(" ")}>
      {await statusLabel(status, now)}
    </span>
  );
}

/** 手機版卡片上方的狀態列：左邊狀態（在線中有圓點），右邊平均回應。 */
export async function StatusBar({
  tech,
  now,
  className,
}: {
  tech: TechCardData;
  now: Date;
  className?: string;
}) {
  const t = await getTranslations("technician");
  return (
    <div className={[styles.bar, styles[tech.status.kind], className].filter(Boolean).join(" ")}>
      <span className={styles.barLabel}>
        {tech.status.kind === "online" && <span className={styles.barDot} aria-hidden="true" />}
        {await statusLabel(tech.status, now)}
      </span>
      <span>{t("responsePlain", { minutes: tech.responseMinutes })}</span>
    </div>
  );
}

/** 綠色證件標籤。check：前面打勾（電腦版設計稿有，手機版詳細卡沒有）。 */
export async function CredentialTags({
  credentials,
  check = true,
}: {
  credentials: Credential[];
  check?: boolean;
}) {
  const t = await getTranslations("technician");
  return (
    <>
      {credentials.map((c) => (
        <Tag key={c} tone={check ? "verified" : "success"}>
          {t(`credential.${c}`)}
        </Tag>
      ))}
    </>
  );
}

/** 灰色證件文字（預約摘要）：「身分驗證 · 良民證 · 證照」。 */
export async function CredentialText({ credentials }: { credentials: Credential[] }) {
  const t = await getTranslations("technician");
  return (
    <span className={styles.credentialText}>
      {credentials.map((c) => t(`credential.${c}`)).join(" · ")}
    </span>
  );
}

/** 「冷凍空調技術士 8 年 · 另有 2 張證照」。 */
export async function licenseText(tech: TechCardData): Promise<string | null> {
  if (!tech.license) return null;
  const t = await getTranslations("technician");
  const { name, years, otherCount } = tech.license;
  return otherCount > 0
    ? t("license", { name, years, count: otherCount })
    : t("licenseOnly", { name, years });
}
