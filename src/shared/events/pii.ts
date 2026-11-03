/**
 * 事件內容不能有個資。和 supabase/migrations/*_events.sql 的
 * event_key_is_forbidden() 規則相同；資料庫也會再擋一次。
 *
 * 欄位名稱拆成單字（底線或駝峰），任何一個單字在禁止清單就擋下。
 * 規則刻意寬：事件內容應該只有編號（xxxId）、數字、狀態。
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
]);

export function isForbiddenKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (lower.includes("id_number") || lower.includes("idnumber")) return true;
  const tokens = key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .split("_");
  return tokens.some((token) => FORBIDDEN_TOKENS.has(token));
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
