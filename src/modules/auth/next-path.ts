import { matchRoute } from "@/shared/navigation/routes";

/**
 * 登入後要回去的頁面（?next=）。只接受站內路由清單上的網址，避免被做成「登入後跳到釣魚網站」的連結。
 * - 一定是 / 開頭、不是 //（別的網站）、沒有反斜線、沒有網域。
 * - 不含語言（/zh-TW/...）；可以帶 ?、#（會去掉）。
 * - 不能是登入頁本身。
 * 不合格回傳 null，由呼叫的地方改用依角色的首頁。
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (typeof next !== "string" || next.length === 0 || next.length > 200) return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return null;
  if (/[\u0000-\u001f]/.test(next)) return null;
  const path = next.split(/[?#]/)[0];
  const route = matchRoute(path);
  if (!route || route.key === "login") return null;
  return path;
}
