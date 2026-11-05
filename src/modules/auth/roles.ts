import type { RouteKey } from "@/shared/navigation/routes";

export const ROLES = ["customer", "technician", "owner", "reviewer", "support"] as const;
export type Role = (typeof ROLES)[number];

export const ADMIN_ROLES: readonly Role[] = ["owner", "reviewer", "support"];

export function isAdmin(roles: readonly string[]): boolean {
  return roles.some((r) => (ADMIN_ROLES as readonly string[]).includes(r));
}

/** 登入後的首頁：管理員 → 後台首頁；師傅 → 今日後台；其他 → 登入後首頁。 */
export function landingRoute(roles: readonly string[]): RouteKey {
  if (isAdmin(roles)) return "admin";
  if (roles.includes("technician")) return "techHome";
  return "dashboard";
}
