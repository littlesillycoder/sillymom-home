import { getLocale, getTranslations } from "next-intl/server";
import { PhoneOtpForm } from "@/modules/auth";
import { destinationFor, getSession } from "@/modules/auth/server";
import { Link, redirect } from "@/shared/i18n/navigation";
import { initRequestLocale } from "@/shared/i18n/request-locale";
import { Container, PageShell } from "@/shared/layout";
import { routeHref } from "@/shared/navigation/routes";
import { getTurnstileProps } from "@/shared/security/turnstile-widget";
import { getIntSetting } from "@/shared/settings/server";
import { FlowSteps, Icon, Stepper } from "@/shared/ui";
import styles from "./page.module.css";

const STEPS = ["describe", "verify", "match", "checkout"] as const;
const AFTER = ["match", "privacy", "home"] as const;

// 每次請求都要看登入狀態（已登入就轉走），不能事先產生；不需要驗證快速顯示。
export const instant = false;

async function resendSeconds(): Promise<number | null> {
  try {
    return await getIntSetting("sms_resend_seconds");
  } catch {
    return null;
  }
}

/**
 * 求助步驟 2：手機快速驗證（#11，設計稿 SignUp）。
 * 驗證完到推薦師傅（求助步驟 3）。右邊「你的求助已保存」卡片在 #15 接上求助資料。
 */
export default async function RequestVerifyPage() {
  await initRequestLocale();
  const t = await getTranslations("auth");
  const flow = await getTranslations("requestFlow");
  const next = routeHref("requestMatch");

  const session = await getSession();
  if (session && !session.needsProfile) {
    redirect({ href: destinationFor(session, next), locale: await getLocale() });
  }
  const [turnstile, seconds] = await Promise.all([getTurnstileProps(), resendSeconds()]);
  const loginHref = { pathname: routeHref("login"), query: { next } };

  return (
    <PageShell
      header={{
        variant: "simple",
        tone: "flow",
        back: { href: routeHref("request"), label: t("back"), arrow: true },
      }}
      footer="none"
    >
      <Container className={styles.page}>
        <div className={styles.mobileSteps}>
          <Stepper
            ariaLabel={flow("label")}
            title={t("verifyStep")}
            current={2}
            total={STEPS.length}
            progressLabel={t("verifyProgress")}
            nextLabel={t("verifyNext")}
          />
        </div>
        <div className={styles.desktopSteps}>
          <FlowSteps
            ariaLabel={flow("label")}
            steps={STEPS.map((s) => flow(`steps.${s}`))}
            current={2}
          />
        </div>

        <h1 className={styles.mobileTitle}>{t("verifyTitle")}</h1>

        <div className={styles.grid}>
          <section className={styles.card} aria-labelledby="verify-title">
            <div className={styles.heading}>
              <h2 id="verify-title" className={styles.cardTitle}>
                <span className={styles.mobileOnly}>{t("verifyCardTitle")}</span>
                <span className={styles.desktopOnly}>{t("verifyTitle")}</span>
              </h2>
              <p className={styles.lead}>{t("verifyLead")}</p>
              <p className={`${styles.haveAccount} ${styles.mobileOnly}`}>
                {t("haveAccount")}
                <Link href={loginHref}>{t("loginInstead")}</Link>
              </p>
            </div>
            <PhoneOtpForm
              variant="verify"
              mode={session ? "completeProfile" : "full"}
              next={next}
              resendSeconds={seconds}
              turnstile={turnstile}
            />
            <p className={`${styles.haveAccount} ${styles.centered} ${styles.desktopOnly}`}>
              {t("haveAccount")}
              <Link href={loginHref}>{t("loginInstead")}</Link>
            </p>
          </section>

          <aside className={styles.aside} aria-labelledby="verify-after">
            <h2 id="verify-after" className={styles.asideTitle}>
              {t("afterTitle")}
            </h2>
            <ul className={styles.afterList}>
              {AFTER.map((key) => (
                <li key={key}>
                  <Icon name="check" size={18} />
                  <span>{t(`after.${key}`)}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </Container>
    </PageShell>
  );
}
