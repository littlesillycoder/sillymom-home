/**
 * 地區設定：每個地區的語言、幣別、時區。之後加歐洲只要加一組。
 * 時間一律存 UTC，顯示時用這裡的時區（不用使用者電腦的設定，伺服器和瀏覽器才會一致）。
 */
export const LOCALES = ["zh-TW", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const CURRENCIES = ["TWD", "EUR"] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export type Region = {
  locales: readonly Locale[];
  defaultLocale: Locale;
  currency: CurrencyCode;
  timeZone: string;
};

export const REGIONS = {
  tw: {
    locales: LOCALES,
    defaultLocale: "zh-TW",
    currency: "TWD",
    timeZone: "Asia/Taipei",
  },
} as const satisfies Record<string, Region>;

export type RegionCode = keyof typeof REGIONS;

/** 目前只有台灣。之後用環境變數 REGION 選地區。 */
export function getRegion(): Region {
  return REGIONS.tw;
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
