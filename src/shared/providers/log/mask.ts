/**
 * 外部服務紀錄的個資遮罩（#4 執行方式第 6 點）。紀錄只用來對帳、查問題，不需要完整個資。
 */

/** 手機：只留前 2 碼和後 3 碼，例如 0912345678 → 09*****678、+886912345678 → +8*******678 */
export function maskPhone(phone: string): string {
  const s = phone.replace(/[\s-]/g, "");
  if (s.length <= 5) return "*".repeat(s.length);
  return `${s.slice(0, 2)}${"*".repeat(s.length - 5)}${s.slice(-3)}`;
}

/** 驗證碼：全部遮掉 */
export function maskCode(): string {
  return "******";
}

/** 發票載具（手機條碼、自然人憑證）：只留後 3 碼，例如 /ABC1234 → *****234 */
export function maskCarrier(carrier: string): string {
  if (carrier.length <= 3) return "*".repeat(carrier.length);
  return `${"*".repeat(carrier.length - 3)}${carrier.slice(-3)}`;
}
