import { defineRouting } from "next-intl/routing";
import { getRegion } from "@/shared/config/regions";

const region = getRegion();

/**
 * 語言路由：網址一律帶語言（/zh-TW/...、/en/...）。
 * 第一次進網站照瀏覽器語言（src/proxy.ts）；使用者切換後用 cookie 記住（只存語言代碼，不含個資）。
 */
export const routing = defineRouting({
  locales: region.locales,
  defaultLocale: region.defaultLocale,
  localePrefix: "always",
  localeCookie: {
    name: "NEXT_LOCALE",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  },
});
