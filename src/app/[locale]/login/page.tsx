import { getLocale, getTranslations } from "next-intl/server";
import { PhoneOtpForm } from "@/modules/auth";
import { destinationFor, getSession } from "@/modules/auth/server";
import { initRequestLocale } from "@/shared/i18n/request-locale";
import { redirect } from "@/shared/i18n/navigation";
import { Container, PageShell } from "@/shared/layout";
import { routeHref } from "@/shared/navigation/routes";
import { getTurnstileProps } from "@/shared/security/turnstile-widget";
import { getIntSetting } from "@/shared/settings/server";
import styles from "./page.module.css";

const WHY = ["record", "verified", "history", "safety"] as const;

/** 讀不到平台設定（例如只跑畫面測試、沒有資料庫）時不顯示倒數，不用寫死的秒數頂替。 */
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
 * 登入或註冊（#11，設計稿 Login）。
 * - 已經登入、資料完整：直接到依角色的首頁（或 ?next= 的頁面）。
 * - 已經登入、還沒填稱呼或同意條款：只顯示補完的欄位。
 */
export default async function LoginPage({ searchParams }: PageProps<"/[locale]/login">) {
  await initRequestLocale();
  const t = await getTranslations("auth");
  const { next } = await searchParams;
  const nextParam = typeof next === "string" ? next : null;

  const session = await getSession();
  if (session && !session.needsProfile) {
    redirect({ href: destinationFor(session, nextParam), locale: await getLocale() });
  }

  const [turnstile, seconds] = await Promise.all([getTurnstileProps(), resendSeconds()]);

  return (
    <PageShell
      header={{ variant: "simple", back: { href: routeHref("home"), label: t("backHome") } }}
      footer="none"
    >
      <Container className={styles.page}>
        <section className={styles.card} aria-labelledby="login-title">
          <div className={styles.heading}>
            <h1 id="login-title" className={styles.title}>
              {t("loginTitle")}
            </h1>
            <p className={styles.lead}>{t("loginLead")}</p>
          </div>
          <PhoneOtpForm
            variant="login"
            mode={session ? "completeProfile" : "full"}
            next={nextParam}
            resendSeconds={seconds}
            turnstile={turnstile}
          />
        </section>
        <aside className={styles.aside} aria-labelledby="login-why">
          <h2 id="login-why" className={styles.asideTitle}>
            {t("whyTitle")}
          </h2>
          {WHY.map((key) => (
            <div key={key} className={styles.reason}>
              <span className={styles.reasonTitle}>{t(`why.${key}.t`)}</span>
              <span className={styles.reasonBody}>{t(`why.${key}.b`)}</span>
            </div>
          ))}
        </aside>
      </Container>
    </PageShell>
  );
}
