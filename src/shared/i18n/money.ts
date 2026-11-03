import type { CurrencyCode, Locale } from "@/shared/config/regions";
import { CURRENCIES } from "@/shared/config/regions";

/**
 * 金額。資料庫用 numeric(12,2) 存精確小數（例如 150.50），另一欄存幣別代碼。
 * 程式裡金額一律用這個型別，加減、比較只能用這個檔案的工具：
 * 內部換成「分」的整數（bigint）計算，不會有小數誤差。不要直接對金額做 + - 。
 */
export type Money = {
  /** 精確小數的文字，最多兩位小數，例如 "150.50"、"-30.00" */
  readonly amount: string;
  readonly currency: CurrencyCode;
};

type CurrencyRule = {
  symbol: string;
  /** 允許的小數位數：台幣沒有角、分 */
  maxFractionDigits: 0 | 2;
};

const RULES: Record<CurrencyCode, CurrencyRule> = {
  TWD: { symbol: "NT$", maxFractionDigits: 0 },
  EUR: { symbol: "€", maxFractionDigits: 2 },
};

/** numeric(12,2) 的範圍：整數部分最多 10 位 */
const MAX_CENTS = 999_999_999_999n;
const AMOUNT_PATTERN = /^(-)?(\d{1,10})(?:\.(\d{1,2}))?$/;

export class MoneyError extends Error {
  name = "MoneyError";
}

function isCurrency(value: string): value is CurrencyCode {
  return (CURRENCIES as readonly string[]).includes(value);
}

function toCents(amount: string): bigint {
  const m = AMOUNT_PATTERN.exec(amount);
  if (!m) throw new MoneyError(`金額格式錯誤：${amount}`);
  const [, sign, whole, frac = ""] = m;
  const cents = BigInt(whole) * 100n + BigInt(frac.padEnd(2, "0"));
  return sign ? -cents : cents;
}

function fromCents(cents: bigint, currency: CurrencyCode): Money {
  if (cents > MAX_CENTS || cents < -MAX_CENTS) {
    throw new MoneyError("金額超出範圍");
  }
  const rule = RULES[currency];
  if (rule.maxFractionDigits === 0 && cents % 100n !== 0n) {
    throw new MoneyError(`${currency} 不能有小數`);
  }
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const amount = `${negative ? "-" : ""}${abs / 100n}.${(abs % 100n).toString().padStart(2, "0")}`;
  return Object.freeze({ amount, currency });
}

/**
 * 建立金額。amount 可以是文字（建議，例如資料庫讀出的 "150.50"）或數字。
 * 數字必須剛好是兩位小數以內，否則丟錯，避免把計算誤差帶進來。
 */
export function money(amount: string | number, currency: string): Money {
  if (!isCurrency(currency)) throw new MoneyError(`不支援的幣別：${currency}`);
  let text: string;
  if (typeof amount === "number") {
    if (!Number.isFinite(amount)) throw new MoneyError("金額不是有限數字");
    text = amount.toFixed(2);
    if (Number(text) !== amount) throw new MoneyError(`金額超過兩位小數：${amount}`);
  } else {
    text = amount.trim();
  }
  return fromCents(toCents(text), currency);
}

function sameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new MoneyError(`幣別不同不能計算：${a.currency} 和 ${b.currency}`);
  }
}

export function addMoney(a: Money, b: Money): Money {
  sameCurrency(a, b);
  return fromCents(toCents(a.amount) + toCents(b.amount), a.currency);
}

export function subtractMoney(a: Money, b: Money): Money {
  sameCurrency(a, b);
  return fromCents(toCents(a.amount) - toCents(b.amount), a.currency);
}

/** 乘以整數（例如數量）。 */
export function multiplyMoney(a: Money, times: number): Money {
  if (!Number.isSafeInteger(times)) throw new MoneyError("只能乘以整數");
  return fromCents(toCents(a.amount) * BigInt(times), a.currency);
}

/** a < b 回傳 -1，相等 0，a > b 回傳 1。 */
export function compareMoney(a: Money, b: Money): -1 | 0 | 1 {
  sameCurrency(a, b);
  const diff = toCents(a.amount) - toCents(b.amount);
  return diff < 0n ? -1 : diff > 0n ? 1 : 0;
}

export function isZeroMoney(a: Money): boolean {
  return toCents(a.amount) === 0n;
}

/** 寫進資料庫 numeric(12,2) 的值。 */
export function toDbAmount(a: Money): string {
  return a.amount;
}

/**
 * 顯示金額：台幣不顯示小數（NT$150）；歐元有小數才顯示（€150、€150.50）。
 * 千分位依語言。
 */
export function formatMoney(a: Money, locale: Locale): string {
  const cents = toCents(a.amount);
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const hasFraction = abs % 100n !== 0n;
  const digits = RULES[a.currency].maxFractionDigits === 2 && hasFraction ? 2 : 0;
  const whole = new Intl.NumberFormat(locale, { useGrouping: true }).format(abs / 100n);
  const fraction = digits ? `.${(abs % 100n).toString().padStart(2, "0")}` : "";
  return `${negative ? "-" : ""}${RULES[a.currency].symbol}${whole}${fraction}`;
}
