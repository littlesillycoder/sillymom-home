"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useRouter } from "@/shared/i18n/navigation";
import { routeHref } from "@/shared/navigation/routes";
import {
  TurnstileClient,
  type TurnstileClientProps,
} from "@/shared/security/turnstile-widget/TurnstileClient";
import { createClient } from "@/shared/supabase/browser";
import { Button } from "@/shared/ui/Button";
import { getRegion } from "@/shared/config/regions";
import { finishLogin, type FinishLoginResult } from "../server/actions";
import { normalizePhone } from "../phone";
import styles from "./PhoneOtpForm.module.css";

type Props = {
  /** login：登入頁；verify：求助流程的手機快速驗證 */
  variant: "login" | "verify";
  /** full：手機、驗證碼、第一次使用的資料；completeProfile：已經登入、只差稱呼和同意條款 */
  mode: "full" | "completeProfile";
  /** 登入後要回去的頁面（伺服器端會再檢查一次） */
  next: string | null;
  /**
   * 重新傳送前要等幾秒（平台設定 sms_resend_seconds，和 Supabase 的設定一致）。
   * 讀不到設定時是 null：不顯示倒數，太早重新傳送會由 Supabase 擋下並顯示「傳送太頻繁」。
   */
  resendSeconds: number | null;
  turnstile: Pick<TurnstileClientProps, "siteKey" | "nonce" | "language">;
};

type ErrorKey =
  | "phoneFormat"
  | "codeFormat"
  | "sendFirst"
  | "tooMany"
  | "captcha"
  | "sendFailed"
  | "codeInvalid"
  | "needProfile"
  | "invalidName"
  | "failed";

const CODE_LENGTH = 6;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Supabase 的錯誤轉成畫面上的訊息（不顯示 Supabase 原本的英文錯誤） */
function sendErrorKey(error: { status?: number; code?: string; message?: string }): ErrorKey {
  if (error.status === 429 || error.code === "over_sms_send_rate_limit") return "tooMany";
  if (error.code?.includes("captcha") || /captcha/i.test(error.message ?? "")) return "captcha";
  return "sendFailed";
}

/**
 * 手機驗證碼登入（#11，設計稿 Login、SignUp）。
 *
 * 資安：
 * - 送驗證碼、比對驗證碼由瀏覽器直接找 Supabase（Supabase 才看得到使用者真正的 IP，次數限制才有效），
 *   送驗證碼要帶 Turnstile 的結果，由 Supabase 驗證。
 * - 驗證碼通過之後才由伺服器判斷是不是新帳號（finishLogin），別人不能用手機號碼查帳號存不存在。
 * - 錯誤訊息不透露帳號是否存在，也不顯示 Supabase 的原始錯誤。
 */
export function PhoneOtpForm({
  variant,
  mode: initialMode,
  next,
  resendSeconds,
  turnstile,
}: Props) {
  const t = useTranslations("auth");
  const router = useRouter();
  // 按下按鈕時才建立連線（沒有 Supabase 設定的環境，例如畫面測試，頁面照樣能顯示）
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const supabase = () => (supabaseRef.current ??= createClient());
  const countryCode = getRegion().phone.countryCode;

  const [mode, setMode] = useState(initialMode);
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [code, setCode] = useState("");
  const [codeFocused, setCodeFocused] = useState(false);
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState<"send" | "submit" | null>(null);
  const [error, setError] = useState<{
    field: "phone" | "code" | "profile" | "form";
    key: ErrorKey;
  } | null>(null);

  // Turnstile：每次送出驗證碼都用掉一個結果，送完換一個新的（key 變了就重新產生）
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const codeInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  async function sendCode() {
    setError(null);
    const e164 = normalizePhone(phone);
    if (!e164) return setError({ field: "phone", key: "phoneFormat" });
    if (!captchaToken) return setError({ field: "form", key: "captcha" });

    setBusy("send");
    // 包在 Promise 裡：建立連線失敗（沒有設定）也會走到 catch
    const { error: sendError } = await Promise.resolve()
      .then(() =>
        supabase().auth.signInWithOtp({ phone: e164, options: { captchaToken, channel: "sms" } }),
      )
      .catch(() => ({ error: { status: 0, code: "unavailable", message: "" } }));
    setCaptchaToken(null);
    setCaptchaKey((k) => k + 1);
    setBusy(null);
    if (sendError) return setError({ field: "phone", key: sendErrorKey(sendError) });

    setSentTo(e164);
    setCountdown(resendSeconds ?? 0);
    setCode("");
    codeInput.current?.focus();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (mode === "full") {
      if (!sentTo) return setError({ field: "phone", key: "sendFirst" });
      if (!new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code)) {
        return setError({ field: "code", key: "codeFormat" });
      }
      setBusy("submit");
      const { error: verifyError } = await Promise.resolve()
        .then(() => supabase().auth.verifyOtp({ phone: sentTo, token: code, type: "sms" }))
        .catch(() => ({ error: { message: "unavailable" } }));
      if (verifyError) {
        setBusy(null);
        return setError({ field: "code", key: "codeInvalid" });
      }
      // 驗證碼通過：之後只差稱呼和同意條款（不用再驗證一次）
      setMode("completeProfile");
    } else {
      setBusy("submit");
    }

    let result: FinishLoginResult;
    try {
      result = await finishLogin({ displayName: name, agreed, next });
    } catch {
      result = { ok: false, error: "failed" };
    }
    if (!result.ok) {
      setBusy(null);
      if (result.error === "notSignedIn") {
        setMode("full");
        return setError({ field: "code", key: "codeInvalid" });
      }
      return setError({
        field: result.error === "failed" ? "form" : "profile",
        key: result.error,
      });
    }
    router.replace(result.redirectTo);
    router.refresh();
  }

  const errorText = (field: "phone" | "code" | "profile" | "form") =>
    error?.field === field ? (
      <p className={styles.error} role="alert">
        {t(`errors.${error.key}`)}
      </p>
    ) : null;

  const digits = Array.from({ length: CODE_LENGTH }, (_, i) => code[i] ?? "");
  const activeIndex = Math.min(code.length, CODE_LENGTH - 1);

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      {mode === "full" && (
        <>
          <div className={styles.field}>
            <label htmlFor="login-phone" className={styles.label}>
              {t("phoneLabel")}
            </label>
            <div className={styles.phoneRow}>
              <span className={styles.prefix}>+{countryCode}</span>
              <input
                id="login-phone"
                className={styles.input}
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder={t("phonePlaceholder")}
                value={phone}
                maxLength={20}
                onChange={(e) => setPhone(e.target.value)}
                aria-invalid={error?.field === "phone" ? true : undefined}
              />
              <button
                type="button"
                className={styles.sendButton}
                onClick={sendCode}
                disabled={busy !== null || countdown > 0}
              >
                {busy === "send" ? t("sending") : sentTo ? t("sent") : t("send")}
              </button>
            </div>
            {errorText("phone")}
          </div>

          <fieldset className={styles.field}>
            <legend className={styles.label}>{t("codeLabel")}</legend>
            <div className={styles.codeWrap}>
              <input
                ref={codeInput}
                className={styles.codeInput}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={CODE_LENGTH}
                value={code}
                aria-label={t("codeLabel")}
                aria-invalid={error?.field === "code" ? true : undefined}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
                onFocus={() => setCodeFocused(true)}
                onBlur={() => setCodeFocused(false)}
              />
              <div className={styles.codeBoxes} aria-hidden="true">
                {digits.map((d, i) => (
                  <span
                    key={i}
                    className={styles.codeBox}
                    data-active={codeFocused && i === activeIndex ? "" : undefined}
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
            {errorText("code")}
            {sentTo && (
              <p className={styles.resend}>
                {countdown > 0 ? (
                  t.rich("resendIn", {
                    time: formatTime(countdown),
                    b: (chunks) => <strong className={styles.time}>{chunks}</strong>,
                  })
                ) : (
                  <>
                    {t("resendPrompt")}
                    <button
                      type="button"
                      className={styles.linkButton}
                      onClick={sendCode}
                      disabled={busy !== null}
                    >
                      {t("resend")}
                    </button>
                  </>
                )}
              </p>
            )}
          </fieldset>
        </>
      )}

      <div className={variant === "login" ? styles.firstTime : styles.profile}>
        {variant === "login" && mode === "full" && (
          <span className={styles.firstTimeLabel}>{t("firstTimeOnly")}</span>
        )}
        {mode === "completeProfile" && <p className={styles.lead}>{t("completeLead")}</p>}
        <div className={styles.field}>
          <label htmlFor="login-name" className={styles.label}>
            {t("nameLabel")}
          </label>
          <input
            id="login-name"
            className={styles.nameInput}
            type="text"
            autoComplete="nickname"
            placeholder={t("namePlaceholder")}
            value={name}
            maxLength={20}
            onChange={(e) => setName(e.target.value)}
            aria-describedby={variant === "verify" ? "login-name-hint" : undefined}
          />
          {variant === "verify" && (
            <span id="login-name-hint" className={styles.hint}>
              {t("nameHint")}
            </span>
          )}
        </div>
        <div className={styles.terms}>
          <label className={styles.checkbox}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span>
              {t.rich("agree", {
                terms: (chunks) => (
                  <Link href={routeHref("terms")} target="_blank" rel="noopener">
                    {chunks}
                  </Link>
                ),
                privacy: (chunks) => (
                  <Link href={routeHref("privacy")} target="_blank" rel="noopener">
                    {chunks}
                  </Link>
                ),
              })}
            </span>
          </label>
        </div>
        {errorText("profile")}
      </div>

      {mode === "full" && (
        <TurnstileClient
          key={captchaKey}
          {...turnstile}
          action="phone-login"
          appearance="interaction-only"
          onToken={setCaptchaToken}
        />
      )}
      {errorText("form")}

      <div className={styles.submitBar}>
        <Button type="submit" size="lg" fullWidth disabled={busy !== null}>
          {busy === "submit"
            ? t("submitting")
            : variant === "login"
              ? t("submitLogin")
              : t("submitVerify")}
        </Button>
      </div>
    </form>
  );
}
