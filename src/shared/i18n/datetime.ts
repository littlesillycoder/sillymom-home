import type { Locale } from "@/shared/config/regions";

/**
 * 日期時間：資料存 UTC，顯示時轉成地區時區（getRegion().timeZone）。
 * 時間一律 24 小時制（15:30），避免預約時搞錯上午、下午。
 */

export class DateTimeError extends Error {
  name = "DateTimeError";
}

/** 只接受 Date 或「有時區」的 ISO 字串（結尾 Z 或 +08:00），避免時間被誤當成本地時間。 */
export function toInstant(value: Date | string): Date {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new DateTimeError("無效的時間");
    return value;
  }
  if (!/(Z|[+-]\d{2}:?\d{2})$/.test(value)) {
    throw new DateTimeError(`時間必須帶時區（UTC 結尾 Z）：${value}`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new DateTimeError(`無效的時間：${value}`);
  return date;
}

type Options = { locale: Locale; timeZone: string };

/** 日期，例如 zh-TW「2026/11/3（週二）」、en「Tue, 11/3/2026」 */
export function formatDate(value: Date | string, { locale, timeZone }: Options): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(toInstant(value));
}

/** 時間，24 小時制，例如「15:30」 */
export function formatTime(value: Date | string, { locale, timeZone }: Options): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(toInstant(value));
}

/** 日期加時間，例如「2026/11/3（週二） 15:30」 */
export function formatDateTime(value: Date | string, options: Options): string {
  return `${formatDate(value, options)} ${formatTime(value, options)}`;
}
