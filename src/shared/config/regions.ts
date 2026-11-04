/**
 * 地區設定：每個地區的語言、幣別、時區、允許的外部服務實作。之後加歐洲只要加一組。
 * 時間一律存 UTC，顯示時用這裡的時區（不用使用者電腦的設定，伺服器和瀏覽器才會一致）。
 */
export const LOCALES = ["zh-TW", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const CURRENCIES = ["TWD", "EUR"] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

/** 外部服務（#4）：金流、發票、簡訊、通知。 */
export const PROVIDER_SERVICES = ["payment", "invoice", "sms", "notify"] as const;
export type ProviderService = (typeof PROVIDER_SERVICES)[number];

export type Region = {
  locales: readonly Locale[];
  defaultLocale: Locale;
  currency: CurrencyCode;
  timeZone: string;
  /** 這個地區允許的外部服務實作；環境變數設成清單以外的值會直接報錯。 */
  providers: Record<ProviderService, readonly string[]>;
};

export const REGIONS = {
  tw: {
    locales: LOCALES,
    defaultLocale: "zh-TW",
    currency: "TWD",
    timeZone: "Asia/Taipei",
    providers: {
      payment: ["mock", "ecpay"],
      invoice: ["mock", "ecpay"],
      sms: ["mock", "every8d"],
      notify: ["mock", "line"],
    },
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
