import type { Locale } from "@/shared/config/regions";

/** 只讀這麼多，避免超長的標頭拖慢伺服器。 */
const MAX_HEADER_LENGTH = 1000;
const MAX_ENTRIES = 20;
const TAG = /^(?:[a-zA-Z]{1,8}(?:-[a-zA-Z0-9]{1,8})*|\*)$/;

/**
 * 依瀏覽器的 Accept-Language 決定第一次進網站的語言（docs/設計補充/設計補充.md 第 1 節）：
 * 第一順位（權重最高、同權重看順序）是中文 → 繁中；其他語言 → 英文。
 * 沒有送、空白、格式不對、只有「*」→ 繁中（台灣的網站）。
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return "zh-TW";

  const entries = header
    .slice(0, MAX_HEADER_LENGTH)
    .split(",")
    .slice(0, MAX_ENTRIES)
    .map((part, index) => {
      const [rawTag, ...params] = part.trim().split(";");
      const tag = rawTag.trim();
      if (!TAG.test(tag)) return null;
      let q = 1;
      for (const param of params) {
        const [key, value] = param.trim().split("=");
        if (key?.trim() === "q") {
          q = Number(value);
          if (!Number.isFinite(q) || q < 0 || q > 1) return null;
        }
      }
      return { tag: tag.toLowerCase(), q, index };
    })
    .filter((e): e is { tag: string; q: number; index: number } => e !== null && e.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);

  const first = entries[0];
  if (!first || first.tag === "*") return "zh-TW";
  return first.tag === "zh" || first.tag.startsWith("zh-") ? "zh-TW" : "en";
}
