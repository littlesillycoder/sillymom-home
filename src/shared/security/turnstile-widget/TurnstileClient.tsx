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
};

/**
 * Cloudflare 官方程式的薄包裝（不用第三方套件）。
 * 驗證通過後，Turnstile 會在所在的 <form> 裡放一個隱藏欄位 cf-turnstile-response，
 * 伺服器端用 verifyTurnstile() 或交給 Supabase Auth 驗證。
 */
export function TurnstileClient({ siteKey, nonce, action, language }: TurnstileClientProps) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = container.current;
    if (!ready || !el || !window.turnstile) return;
    const id = window.turnstile.render(el, {
      sitekey: siteKey,
      action,
      language,
      theme: "light",
      size: "flexible",
      "response-field-name": TURNSTILE_FORM_FIELD,
    });
    return () => {
      if (id) window.turnstile?.remove(id);
    };
  }, [ready, siteKey, action, language]);

  return (
    <>
      <Script
        src={TURNSTILE_SCRIPT_SRC}
        nonce={nonce}
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      />
      <div ref={container} className={styles.widget} data-testid="turnstile" />
    </>
  );
}
