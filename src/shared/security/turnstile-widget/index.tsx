import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { getTurnstileSiteKey } from "@/shared/config/env";
import { NONCE_REQUEST_HEADER } from "../nonce";
import { TurnstileClient, type TurnstileClientProps } from "./TurnstileClient";

export { TurnstileClient, type TurnstileClientProps } from "./TurnstileClient";

/**
 * 給瀏覽器端表單自己放 TurnstileClient 用（#11 登入）：在伺服器端讀網站金鑰、nonce、語言，
 * 當作 props 交給表單。
 */
export async function getTurnstileProps(): Promise<
  Pick<TurnstileClientProps, "siteKey" | "nonce" | "language">
> {
  const nonce = (await headers()).get(NONCE_REQUEST_HEADER) ?? undefined;
  const locale = await getLocale();
  return { siteKey: getTurnstileSiteKey(), nonce, language: locale === "en" ? "en" : "zh-tw" };
}

/**
 * Turnstile（防機器人）畫面元件（#6）。放在 <form> 裡面使用：
 *   <form action={...}><TurnstileWidget action="appeal" />...</form>
 * action 要和伺服器端 verifyTurnstile({ expectedAction }) 一樣。
 * 網站金鑰（可以公開）和 nonce 在伺服器端讀，再交給瀏覽器端元件。
 */
export async function TurnstileWidget({ action }: { action: string }) {
  const nonce = (await headers()).get(NONCE_REQUEST_HEADER) ?? undefined;
  const locale = await getLocale();
  return (
    <TurnstileClient
      siteKey={getTurnstileSiteKey()}
      nonce={nonce}
      action={action}
      language={locale === "en" ? "en" : "zh-tw"}
    />
  );
}
