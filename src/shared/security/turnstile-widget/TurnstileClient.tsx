"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { TURNSTILE_FORM_FIELD, TURNSTILE_SCRIPT_SRC } from "../turnstile-constants";
import styles from "./TurnstileWidget.module.css";

type TurnstileApi = {
  render(container: HTMLElement, options: Record<string, unknown>): string | undefined;
  remove(widgetId: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export type TurnstileClientProps = {
  siteKey: string;
  /** 這次請求的 CSP nonce，沒有的話 Cloudflare 的程式會被 CSP 擋下 */
  nonce: string | undefined;
  action: string;
  language: "zh-tw" | "en";
  /**
   * 拿到（或失效）驗證結果時呼叫。給「瀏覽器直接送給 Supabase」的表單用（#11）；
   * 沒有的話，結果放在表單的隱藏欄位 cf-turnstile-response。
   */
  onToken?: (token: string | null) => void;
  /** always：一直顯示框；interaction-only：平常不顯示，判斷可能是機器人時才出現（#11） */
  appearance?: "always" | "interaction-only";
};

/**
 * Cloudflare 官方程式的薄包裝（不用第三方套件）。
 * 驗證通過後，Turnstile 會在所在的 <form> 裡放一個隱藏欄位 cf-turnstile-response，
 * 伺服器端用 verifyTurnstile() 或交給 Supabase Auth 驗證。
 */
export function TurnstileClient({
  siteKey,
  nonce,
  action,
  language,
  onToken,
  appearance = "always",
}: TurnstileClientProps) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  // 最新的 onToken（不讓它變動時重新畫 Turnstile）
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    const el = container.current;
    if (!ready || !el || !window.turnstile) return;
    const id = window.turnstile.render(el, {
      sitekey: siteKey,
      action,
      language,
      theme: "light",
      size: "flexible",
      appearance,
      "response-field-name": TURNSTILE_FORM_FIELD,
      callback: (token: string) => onTokenRef.current?.(token),
      "expired-callback": () => onTokenRef.current?.(null),
      "error-callback": () => onTokenRef.current?.(null),
    });
    return () => {
      if (id) window.turnstile?.remove(id);
    };
  }, [ready, siteKey, action, language, appearance]);

  return (
    <>
      <Script
        src={TURNSTILE_SCRIPT_SRC}
        nonce={nonce}
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      />
      <div
        ref={container}
        className={appearance === "always" ? styles.widget : undefined}
        data-testid="turnstile"
      />
    </>
  );
}
