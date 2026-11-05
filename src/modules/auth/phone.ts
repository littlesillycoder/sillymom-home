import { getRegion } from "@/shared/config/regions";

/**
 * 把使用者輸入的手機號碼整理成國際格式（E.164），例如 +886912345678。
 * 接受：0912345678、0912-345-678、912 345 678、+886 912 345 678、886912345678。
 * 格式不對回傳 null（在送給 Supabase 之前就擋下）。
 */
export function normalizePhone(input: string): string | null {
  const { countryCode, mobilePattern } = getRegion().phone;
  if (typeof input !== "string" || input.length > 30) return null;
  const compact = input.replace(/[\s()-]/g, "");
  if (!/^\+?\d+$/.test(compact)) return null;

  let local = compact.replace(/^\+/, "");
  if (local.startsWith(countryCode)) local = local.slice(countryCode.length);
  if (local.startsWith("0")) local = local.slice(1);
  return mobilePattern.test(local) ? `+${countryCode}${local}` : null;
}

/** 畫面上顯示的號碼（不含國碼），例如 912 345 678。只給使用者自己看，不放進 log。 */
export function formatLocalPhone(e164: string): string {
  const { countryCode } = getRegion().phone;
  const local = e164.replace(`+${countryCode}`, "");
  return local.replace(/^(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3");
}
