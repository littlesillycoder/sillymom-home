import { isForbiddenKey } from "@/shared/events/pii";

/**
 * log 的個資遮蔽（#6）。兩層：
 * 1. 依欄位名稱：和事件的個資規則相同（src/shared/events/pii.ts：手機、地址、email、姓名、
 *    證件號碼、LINE 使用者 ID、驗證碼、卡號、token、密碼…），再加上 authorization、cookie、
 *    API 金鑰（isSensitiveLogKey），整個值換成 [redacted]。
 * 2. 依文字內容：看起來像手機、email、身分證／居留證號、卡號、LINE 使用者 ID 的部分換掉。
 *
 * 地址、姓名沒辦法靠格式判斷，只能放在有名稱的欄位（例如 { address }），不能夾在一段文字裡。
 * 之後的錯誤監控（#93）送出前也要用這裡的 maskValue()。
 */

export const REDACTED = "[redacted]";

/**
 * log 另外要遮的欄位（事件不會有這些，所以不放進事件的規則）：
 * HTTP 的登入資訊、cookie、API 金鑰。
 */
const LOG_ONLY_SENSITIVE = /(^|_)(authorization|cookie|cookies|set_cookie|api_key|apikey)(_|$)/;

export function isSensitiveLogKey(key: string): boolean {
  if (isForbiddenKey(key)) return true;
  const snake = key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/-/g, "_")
    .toLowerCase();
  return LOG_ONLY_SENSITIVE.test(snake);
}

/** 文字裡的個資格式。順序有關係：email 先（裡面可能有數字），卡號在手機前。 */
const PATTERNS: ReadonlyArray<{ label: string; re: RegExp; check?: (match: string) => boolean }> = [
  { label: "email", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  // LINE 使用者 ID：U + 32 個 16 進位字元
  { label: "line-id", re: /\bU[0-9a-f]{32}\b/g },
  // 身分證（A123456789）、新式居留證（A800000014）、舊式居留證（AB12345678）
  { label: "id-no", re: /\b[A-Z][12890]\d{8}\b|\b[A-Z][A-D]\d{8}\b/g },
  // 卡號：13～19 位數字（可有空白或 -），通過 Luhn 檢查才算，避免把時間戳記等數字誤遮
  { label: "card", re: /\b\d(?:[ -]?\d){12,18}\b/g, check: (m) => luhn(m.replace(/\D/g, "")) },
  // 台灣手機：09xx-xxx-xxx、+886 9xx…
  { label: "phone", re: /(?:\+?886[-\s]?|\b0)9\d{2}[-\s]?\d{3}[-\s]?\d{3}\b/g },
];

function luhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/** 一段文字最多記這麼長，太長的截斷（避免把整份資料倒進 log）。 */
export const MAX_STRING_LENGTH = 500;
const MAX_DEPTH = 5;
const MAX_ITEMS = 50;

export function maskString(text: string): string {
  let out = text.length > MAX_STRING_LENGTH ? `${text.slice(0, MAX_STRING_LENGTH)}…` : text;
  for (const { label, re, check } of PATTERNS) {
    out = out.replace(re, (m) => (check && !check(m) ? m : `[${label}]`));
  }
  return out;
}

/** 遮蔽任何值：物件依欄位名稱、文字依格式。不改動原本的值。 */
export function maskValue(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return maskString(value);
  if (value === null || typeof value !== "object") {
    return typeof value === "function" || typeof value === "symbol" ? undefined : value;
  }
  if (depth >= MAX_DEPTH) return "[too-deep]";
  if (value instanceof Error) return serializeError(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value.slice(0, MAX_ITEMS).map((item) => maskValue(item, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value).slice(0, MAX_ITEMS)) {
    out[key] = isSensitiveLogKey(key) ? REDACTED : maskValue(child, depth + 1);
  }
  return out;
}

/** 錯誤只記類型和遮蔽後的訊息，不記整個物件（可能帶著查詢內容或使用者資料）。 */
export function serializeError(error: unknown): { name: string; message?: string } {
  if (error instanceof Error) return { name: error.name, message: maskString(error.message) };
  return { name: "NonError" };
}
