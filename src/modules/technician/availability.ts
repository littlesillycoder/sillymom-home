import type { Locale } from "@/shared/config/regions";
import { formatTime, toInstant } from "@/shared/i18n/datetime";

/**
 * 「可視訊：[時間]」的格式（#9 執行方式）：
 * - 今天：可視訊：今天 20:00 後
 * - 明天：可視訊：明天 10:00
 * - 更晚：可視訊：11/6（四）10:00
 * 今天、明天依地區時區（台灣）的日期判斷，不是依 UTC。
 */
export type AvailabilityParts =
  | { day: "today"; time: string }
  | { day: "tomorrow"; time: string }
  | { day: "later"; date: string; time: string };

type Options = { locale: Locale; timeZone: string };

/** 某個時間在地區時區是哪一天（YYYY-MM-DD），用來比較「今天、明天」。 */
function localDay(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDays(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return utc.toISOString().slice(0, 10);
}

/** 短日期：zh-TW「11/6（四）」；en「Thu 11/6」。 */
export function formatShortDate(value: Date | string, { locale, timeZone }: Options): string {
  const date = toInstant(value);
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone,
    month: "numeric",
    day: "numeric",
    weekday: locale === "zh-TW" ? "narrow" : "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return locale === "zh-TW"
    ? `${get("month")}/${get("day")}（${get("weekday")}）`
    : `${get("weekday")} ${get("month")}/${get("day")}`;
}

export function availabilityParts(at: string, now: Date, options: Options): AvailabilityParts {
  const target = toInstant(at);
  const time = formatTime(target, options);
  const today = localDay(now, options.timeZone);
  const day = localDay(target, options.timeZone);
  if (day <= today) return { day: "today", time };
  if (day === addDays(today, 1)) return { day: "tomorrow", time };
  return { day: "later", date: formatShortDate(target, options), time };
}
