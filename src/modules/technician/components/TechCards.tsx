import { getTranslations } from "next-intl/server";
import { Link } from "@/shared/i18n/navigation";
import { routeHref } from "@/shared/navigation/routes";
import { Button, ButtonLink } from "@/shared/ui/Button";
import { Tag } from "@/shared/ui/Tag";
import type { TechCardData } from "../types";
import {
  CredentialTags,
  GenderTag,
  licenseText,
  profileHref,
  RatingBlock,
  ratingLine,
  ServicesTag,
  StatusBar,
  StatusPill,
  TechAvatar,
} from "./parts";
import styles from "./TechCards.module.css";

/**
 * 師傅卡（#9）。所有卡片只顯示稱呼、頭像字、評分、專長、證件等公開資訊，
 * 不顯示全名、手機號碼。now：現在時間，用來顯示「可視訊：今天 20:00 後」（由頁面傳入）。
 *
 * 會改資料的按鈕（結束後通知我、移除）目前沒有動作；之後接上真的功能時一律用 POST（見 CLAUDE.md）。
 */
type CardProps = { tech: TechCardData; now: Date };

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(" ");

/** 簡易卡（首頁、服務分類）：整張卡連到師傅個人頁。 */
export async function SimpleTechCard({ tech, now }: CardProps) {
  const t = await getTranslations("technician");
  const license = await licenseText(tech);
  return (
    <Link href={profileHref(tech)} className={cx(styles.card, styles.simple)}>
      <div className={styles.simpleTop}>
        <span className={styles.simpleLeft}>
          <TechAvatar tech={tech} size={64} />
          <RatingBlock tech={tech} />
        </span>
        <span className={styles.simpleMain}>
          <span className={styles.nameRow}>
            <span className={styles.name}>{tech.displayName}</span>
            <GenderTag gender={tech.gender} />
            <StatusPill status={tech.status} now={now} className={styles.push} />
          </span>
          <span className={styles.text}>
            <span className={styles.specialties}>{tech.specialties}</span>
            {license && <span className={styles.license}>{license}</span>}
          </span>
          <span className={styles.tags}>
            <CredentialTags credentials={tech.credentials} />
          </span>
          <span className={styles.tags}>
            <ServicesTag count={tech.serviceCount} />
          </span>
        </span>
      </div>
      <span className={styles.simpleFoot}>{t("viewProfileArrow")}</span>
    </Link>
  );
}

/**
 * 簡易卡＋預約（登入後首頁「我信任的師傅」）：預約按鈕在「[N] 次服務」那一行右邊。
 * 手機版照 mobile/Dashboard：上方狀態列、預約按鈕在專長那一行右邊。
 */
export async function SimpleTechCardWithBooking({ tech, now }: CardProps) {
  const t = await getTranslations("technician");
  const license = await licenseText(tech);
  // 預約：先到師傅個人頁選時段（之後的 issue 接上）
  const bookHref = profileHref(tech);
  return (
    <>
      <div className={cx(styles.mobileOnly, styles.compact)}>
        <StatusBar tech={tech} now={now} className={styles.compactBar} />
        <div className={styles.compactRow}>
          <TechAvatar tech={tech} size={48} link label={t("viewProfile")} />
          <span className={styles.compactMain}>
            <span className={styles.compactLine}>
              <span className={styles.nameRow}>
                <Link href={profileHref(tech)} className={styles.compactName}>
                  {tech.displayName}
                </Link>
                <GenderTag gender={tech.gender} />
              </span>
              <ServicesTag count={tech.serviceCount} />
            </span>
            <span className={styles.compactLine}>
              <span className={styles.ellipsis}>{tech.specialties}</span>
              <Link href={bookHref} className={styles.bookButton}>
                {t("book")}
              </Link>
            </span>
          </span>
        </div>
      </div>

      <div className={cx(styles.desktopOnly, styles.card, styles.simple)}>
        <div className={styles.simpleTop}>
          <span className={styles.simpleLeft}>
            <TechAvatar tech={tech} size={64} link label={t("viewProfile")} />
            <RatingBlock tech={tech} />
          </span>
          <span className={styles.simpleMain}>
            <span className={styles.nameRow}>
              <Link href={profileHref(tech)} className={styles.name}>
                {tech.displayName}
              </Link>
              <GenderTag gender={tech.gender} />
              <StatusPill status={tech.status} now={now} className={styles.push} />
            </span>
            <span className={styles.text}>
              <span className={styles.specialties}>{tech.specialties}</span>
              {license && <span className={styles.license}>{license}</span>}
            </span>
            <span className={styles.tags}>
              <CredentialTags credentials={tech.credentials} />
            </span>
            <span className={styles.servicesRow}>
              <ServicesTag count={tech.serviceCount} />
              <Link href={bookHref} className={styles.bookButton}>
                {t("book")}
              </Link>
            </span>
          </span>
        </div>
      </div>
    </>
  );
}

/** 詳細卡的主要按鈕：跟著狀態變。 */
async function PrimaryAction({ tech, fullWidth }: { tech: TechCardData; fullWidth?: boolean }) {
  const t = await getTranslations("technician");
  if (tech.status.kind === "online") {
    return (
      <ButtonLink href={routeHref("request")} size="lg" fullWidth={fullWidth}>
        {t("videoNow")}
      </ButtonLink>
    );
  }
  if (tech.status.kind === "inCall") {
    // 「結束後通知我」會建立通知訂閱：#57 接上時用 POST，目前沒有動作
    return (
      <Button variant="secondary" size="lg" fullWidth={fullWidth}>
        {t("notifyWhenDone")}
      </Button>
    );
  }
  return (
    <ButtonLink href={routeHref("request")} variant="book" size="lg" fullWidth={fullWidth}>
      {t("bookVideo")}
    </ButtonLink>
  );
}

/**
 * 詳細卡（師傅列表、推薦師傅）：
 * 1100 以上四區橫排；768–1099 狀態在名字那一排右邊、按鈕在下方靠右；767 以下照手機設計稿。
 */
export async function DetailedTechCard({ tech, now }: CardProps) {
  const t = await getTranslations("technician");
  const license = await licenseText(tech);
  const languages = tech.languages.map((l) => t(`language.${l}`)).join(" · ");

  return (
    <>
      <article className={cx(styles.mobileOnly, styles.card, styles.detailedMobile)}>
        <StatusBar tech={tech} now={now} />
        <div className={styles.detailedMobileBody}>
          <div className={styles.mobileHead}>
            <TechAvatar tech={tech} size={56} link label={t("viewProfile")} />
            <span className={styles.mobileHeadMain}>
              <span className={styles.compactLine}>
                <span className={styles.nameRow}>
                  <Link href={profileHref(tech)} className={styles.mobileName}>
                    {tech.displayName}
                  </Link>
                  <GenderTag gender={tech.gender} />
                  {tech.recentlyCalled && <Tag tone="attention">{t("recentlyCalled")}</Tag>}
                </span>
                <ServicesTag count={tech.serviceCount} />
              </span>
              <span className={styles.ellipsis}>{await ratingLine(tech)}</span>
            </span>
          </div>
          <div className={styles.divider} />
          <span className={styles.tags}>
            <CredentialTags credentials={tech.credentials} check={false} />
          </span>
          <p className={styles.mobileText}>{tech.specialties}</p>
          {license && <p className={cx(styles.mobileText, styles.mobileMuted)}>{license}</p>}
          {languages && <p className={cx(styles.mobileText, styles.mobileMuted)}>{languages}</p>}
          <div className={styles.actionsTwo}>
            <ButtonLink href={profileHref(tech)} variant="secondary" size="lg" fullWidth>
              {t("viewProfile")}
            </ButtonLink>
            <PrimaryAction tech={tech} fullWidth />
          </div>
        </div>
      </article>

      <article className={cx(styles.desktopOnly, styles.card)}>
        <div className={styles.detailed}>
          <div className={styles.detailedLeft}>
            <TechAvatar tech={tech} size={80} online={tech.status.kind === "online"} />
            <RatingBlock tech={tech} />
          </div>
          <div className={styles.detailedMain}>
            <span className={styles.nameRow}>
              <Link href={profileHref(tech)} className={cx(styles.name, styles.detailedName)}>
                {tech.displayName}
              </Link>
              <GenderTag gender={tech.gender} />
              <ServicesTag count={tech.serviceCount} />
              {tech.recentlyCalled && <Tag tone="attention">{t("recentlyCalled")}</Tag>}
              <StatusPill status={tech.status} now={now} className={styles.inlineStatus} />
            </span>
            <span className={styles.text}>
              <span className={styles.specialties}>{tech.specialties}</span>
              {license && <span className={styles.license}>{license}</span>}
            </span>
            <span className={styles.tags}>
              <CredentialTags credentials={tech.credentials} />
              {languages && <Tag tone="neutral">{languages}</Tag>}
            </span>
          </div>
          <div className={styles.detailedStatus}>
            <StatusPill status={tech.status} now={now} className={styles.bigStatus} />
            <span className={styles.response}>
              {t.rich("response", { minutes: tech.responseMinutes, b: (c) => <b>{c}</b> })}
            </span>
          </div>
          <div className={styles.detailedActions}>
            <ButtonLink href={profileHref(tech)} variant="secondary" size="lg">
              {t("viewProfile")}
            </ButtonLink>
            <PrimaryAction tech={tech} />
          </div>
        </div>
      </article>
    </>
  );
}

/** 我信任的師傅卡（我信任的師傅與封鎖頁）：下方「預約、傳訊息、移除」。 */
export async function FavoriteTechCard({ tech, now }: CardProps) {
  const t = await getTranslations("technician");
  const line = [
    tech.specialties,
    tech.collaborationCount !== undefined
      ? t("collaborations", { count: tech.collaborationCount })
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <article className={cx(styles.card, styles.favorite)}>
      <StatusBar tech={tech} now={now} />
      <div className={styles.favoriteBody}>
        <div className={styles.mobileHead}>
          <TechAvatar tech={tech} size={48} link label={t("viewProfile")} />
          <span className={styles.mobileHeadMain}>
            <span className={styles.compactLine}>
              <span className={styles.nameRow}>
                <Link href={profileHref(tech)} className={styles.compactName}>
                  {tech.displayName}
                </Link>
                <GenderTag gender={tech.gender} />
              </span>
              <ServicesTag count={tech.serviceCount} />
            </span>
            <span className={styles.ellipsis}>{line}</span>
          </span>
        </div>
        <div className={styles.actionsThree}>
          <ButtonLink href={profileHref(tech)} variant="book" fullWidth>
            {t("book")}
          </ButtonLink>
          <ButtonLink href={routeHref("messages")} variant="secondary" fullWidth>
            {t("message")}
          </ButtonLink>
          {/* 移除：#33 接上時用 POST（伺服器端確認是本人），目前沒有動作 */}
          <Button variant="quiet">{t("remove")}</Button>
        </div>
      </div>
    </article>
  );
}

/**
 * 預約摘要的師傅列（確認與付款、預約到府、行程追蹤）。
 * 證件一律用綠色打勾標籤（docs/設計補充/設計補充.md 第 7 節），手機、電腦都一樣。
 * - 768 以上照 desktop/Checkout：頭像＋評分｜名字、性別、次數、專長、證照、證件｜右邊狀態（有傳 status 才顯示）
 * - 767 以下照 mobile/Checkout：頭像、名字、性別、右邊次數；下一行證件
 * status：這筆預約的狀態或時間，例如視訊時間（{ kind: "later", at }）。
 */
export async function TechSummaryRow({
  tech,
  status,
  now,
}: {
  tech: TechCardData;
  status?: TechCardData["status"];
  now?: Date;
}) {
  const license = await licenseText(tech);
  return (
    <>
      <div className={cx(styles.mobileOnly, styles.summary)}>
        <TechAvatar tech={tech} size={48} />
        <span className={styles.summaryMain}>
          <span className={styles.compactLine}>
            <span className={styles.nameRow}>
              <span className={styles.summaryName}>{tech.displayName}</span>
              <GenderTag gender={tech.gender} />
            </span>
            <ServicesTag count={tech.serviceCount} />
          </span>
          <span className={styles.tags}>
            <CredentialTags credentials={tech.credentials} />
          </span>
        </span>
      </div>

      <div className={cx(styles.desktopOnly, styles.summaryDesktop)}>
        <span className={styles.simpleLeft}>
          <TechAvatar tech={tech} size={64} />
          <RatingBlock tech={tech} />
        </span>
        <span className={styles.simpleMain}>
          <span className={styles.nameRow}>
            <span className={styles.name}>{tech.displayName}</span>
            <GenderTag gender={tech.gender} />
            <ServicesTag count={tech.serviceCount} />
          </span>
          <span className={styles.text}>
            <span className={styles.specialties}>{tech.specialties}</span>
            {license && <span className={styles.license}>{license}</span>}
          </span>
          <span className={styles.tags}>
            <CredentialTags credentials={tech.credentials} />
          </span>
        </span>
        {status && now && <StatusPill status={status} now={now} className={styles.bigStatus} />}
      </div>
    </>
  );
}
