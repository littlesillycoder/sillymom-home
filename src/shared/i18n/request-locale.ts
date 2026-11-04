import "server-only";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/shared/config/regions";
import { routing } from "./routing";

/**
 * 每個用到翻譯的 layout、page 開頭都要呼叫一次（next-intl 的規定）：
 * 告訴 next-intl 目前的語言，頁面才能預先產生，不必等到請求時讀標頭。
 * 資安：只接受設定好的語言，其他一律 404。
 */
export async function initRequestLocale(): Promise<Locale> {
  const locale = await rootLocale();
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return locale;
}
