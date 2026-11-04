import { getTranslations } from "next-intl/server";
import {
  DetailedTechCard,
  FavoriteTechCard,
  SimpleTechCard,
  SimpleTechCardWithBooking,
  TechSummaryRow,
  type TechCardData,
} from "@/modules/technician";
import { Card } from "@/shared/ui";
import styles from "./page.module.css";

/** 台灣時間某天某點的 UTC ISO 字串（範例資料用）。 */
function taipeiAt(now: Date, addDays: number, hour: number): string {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + addDays, hour - 8)).toISOString();
}

/** 標示目前看到的是哪一個版本（依視窗寬度切換）。 */
async function VersionBadge() {
  const t = await getTranslations("devUi");
  return (
    <span className={styles.version}>
      {t("versionNow")}
      <span className={styles.vMobile}>{t("versionMobile")}</span>
      <span className={styles.vTablet}>{t("versionTablet")}</span>
      <span className={styles.vDesktop}>{t("versionDesktop")}</span>
    </span>
  );
}

/** 元件展示：五種師傅卡 × 三種狀態（假資料）。 */
export async function TechCardsDemo({ now }: { now: Date }) {
  const t = await getTranslations("devUi");
  const license = { name: t("licenseName"), years: 8, otherCount: 2 };
  const techs: TechCardData[] = [
    {
      id: "3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b",
      displayName: t("nameA"),
      gender: "female",
      rating: 4.9,
      reviewCount: 128,
      serviceCount: 312,
      specialties: t("specialtiesA"),
      license,
      credentials: ["identity", "policeRecord", "license"],
      languages: ["mandarin", "taiwanese"],
      status: { kind: "online" },
      responseMinutes: 2,
      collaborationCount: 3,
    },
    {
      id: "7a1c2d3e-5b6f-4a8b-9c0d-2e3f4a5b6c7d",
      displayName: t("nameB"),
      gender: "female",
      rating: 4.7,
      reviewCount: 56,
      serviceCount: 140,
      specialties: t("specialtiesB"),
      license: { ...license, years: 5, otherCount: 1 },
      credentials: ["identity", "policeRecord", "license"],
      languages: ["mandarin"],
      status: { kind: "inCall" },
      responseMinutes: 5,
      recentlyCalled: true,
      collaborationCount: 1,
    },
    {
      id: "9c8b7a6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
      displayName: t("nameC"),
      gender: "male",
      rating: null,
      reviewCount: 0,
      serviceCount: 12,
      specialties: t("specialtiesC"),
      license: { ...license, years: 3, otherCount: 0 },
      credentials: ["identity", "license"],
      languages: ["mandarin", "taiwanese", "hakka"],
      status: { kind: "later", at: taipeiAt(now, 0, 20) },
      responseMinutes: 15,
      collaborationCount: 2,
    },
  ];
  const tomorrow = { ...techs[2], status: { kind: "later" as const, at: taipeiAt(now, 1, 10) } };
  const later = { ...techs[2], status: { kind: "later" as const, at: taipeiAt(now, 2, 10) } };

  return (
    <section className={styles.section}>
      <h2>
        {t("techCards")}
        <VersionBadge />
      </h2>
      <p className={styles.hint}>{t("versionHint")}</p>

      <h3 className={styles.subTitle}>
        {t("simple")}
        <VersionBadge />
      </h3>
      <div className={styles.cardGrid}>
        {techs.map((tech) => (
          <SimpleTechCard key={tech.id} tech={tech} now={now} />
        ))}
      </div>

      <h3 className={styles.subTitle}>
        {t("simpleBook")}
        <VersionBadge />
      </h3>
      <div className={styles.cardGrid}>
        <SimpleTechCardWithBooking tech={techs[0]} now={now} />
        <SimpleTechCardWithBooking tech={tomorrow} now={now} />
        <SimpleTechCardWithBooking tech={later} now={now} />
      </div>

      <h3 className={styles.subTitle}>
        {t("detailed")}
        <VersionBadge />
      </h3>
      <div className={styles.stack}>
        {techs.map((tech) => (
          <DetailedTechCard key={tech.id} tech={tech} now={now} />
        ))}
      </div>

      <h3 className={styles.subTitle}>
        {t("favorite")}
        <VersionBadge />
      </h3>
      <div className={styles.cardGrid}>
        <FavoriteTechCard tech={techs[0]} now={now} />
        <FavoriteTechCard tech={tomorrow} now={now} />
        <FavoriteTechCard tech={later} now={now} />
      </div>

      <h3 className={styles.subTitle}>
        {t("summary")}
        <VersionBadge />
      </h3>
      <Card>
        <TechSummaryRow tech={techs[0]} status={tomorrow.status} now={now} />
      </Card>
    </section>
  );
}
