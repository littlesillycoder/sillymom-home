import { Noto_Sans_TC } from "next/font/google";

/**
 * Noto Sans TC：建置時下載、跟網站一起提供，使用者瀏覽時不連到 Google（不把使用者 IP 送給第三方）。
 * 中文字型很大，next/font 會切成小塊，只載入頁面用到的字。
 */
export const notoSansTC = Noto_Sans_TC({
  weight: ["400", "500", "700", "900"],
  display: "swap",
  preload: false,
  variable: "--font-noto-sans-tc",
});
