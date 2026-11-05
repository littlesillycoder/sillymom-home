/**
 * 事件內容不能有個資。和 supabase/migrations/*_events.sql 的
 * event_key_is_forbidden() 規則相同；資料庫的 events_validate 觸發程序也會再擋一次。
 *
 * 欄位名稱拆成單字（底線或駝峰），任何一個單字在禁止清單就擋下。
 * 規則刻意寬：事件內容應該只有編號（xxxId）、數字、狀態。
 * log 工具（src/shared/log）也用同一份規則遮蔽欄位。
 * 改這裡要一起改資料庫的 event_key_is_forbidden()（新的 migration），兩邊有各自的測試。
 */
const FORBIDDEN_TOKENS = new Set([
  "phone",
  "mobile",
  "tel",
  "address",
  "addr",
  "email",
  "mail",
  "name",
  "birthday",
  "birthdate",
  "password",
  "passwd",
  "secret",
  "token",
  "card",
  "idno",
  "national",
  "passport",
  "lat",
  "lng",
  "latitude",
  "longitude",
  "otp",
]);

/** LINE 使用者 ID（lineId、line_user_id、lineUserId）。只擋 line 後面接 id 的，lineItems 等不受影響。 */
const LINE_ID = /(^|_)line_(user_)?id(_|$)/;

export function isForbiddenKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (lower.includes("id_number") || lower.includes("idnumber")) return true;
  const snake = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
  if (LINE_ID.test(snake)) return true;
  return snake.split("_").some((token) => FORBIDDEN_TOKENS.has(token));
}

/** 回傳所有不允許的欄位路徑，例如 ["customer.phone"]。 */
export function findForbiddenKeys(value: unknown, path = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => findForbiddenKeys(item, `${path}[${i}]`));
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => {
      const childPath = path ? `${path}.${key}` : key;
      return [...(isForbiddenKey(key) ? [childPath] : []), ...findForbiddenKeys(child, childPath)];
    });
  }
  return [];
}
