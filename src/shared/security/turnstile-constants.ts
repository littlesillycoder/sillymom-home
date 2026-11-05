/** 瀏覽器和伺服器都會用到的 Turnstile 設定（不含任何金鑰）。 */

/** 表單送出的欄位名稱（Turnstile 預設） */
export const TURNSTILE_FORM_FIELD = "cf-turnstile-response";

/** Cloudflare 官方的程式。explicit：由我們的元件決定什麼時候畫出來。不能自己複製一份放在網站上（Cloudflare 會更新）。 */
export const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
