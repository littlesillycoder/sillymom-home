import "server-only";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { redirect } from "@/shared/i18n/navigation";
import { accessFor, matchRoute, routeHref, type Access } from "@/shared/navigation/routes";
import { createClient } from "@/shared/supabase/server";
import { safeNextPath } from "../next-path";
import { isAdmin, landingRoute, ROLES, type Role } from "../roles";

export type Session = {
  userId: string;
  roles: Role[];
  displayName: string;
  /** 還沒填稱呼或還沒同意目前版本的條款（要回登入頁補完才能用） */
  needsProfile: boolean;
};

/**
 * 目前登入的使用者。用 getUser() 跟 Supabase 確認登入有效（不只看 cookie）。
 * 沒登入回傳 null。
 */
export async function getSession(): Promise<Session | null> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    // 沒有 Supabase 設定（例如只跑畫面測試）：當成沒登入
    return null;
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [roles, customer, version] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("customers").select("display_name").eq("user_id", user.id).maybeSingle(),
    supabase.rpc("current_terms_version"),
  ]);
  const accepted = await supabase
    .from("terms_acceptances")
    .select("document")
    .eq("user_id", user.id)
    .eq("version", version.data ?? "");

  const roleList = (roles.data ?? [])
    .map((r) => r.role)
    .filter((r): r is Role => (ROLES as readonly string[]).includes(r));
  const displayName = customer.data?.display_name ?? "";
  const docs = new Set((accepted.data ?? []).map((a) => a.document));
  const needsProfile =
    displayName.trim() === "" || !version.data || !docs.has("terms") || !docs.has("privacy");

  return { userId: user.id, roles: roleList, displayName, needsProfile };
}

export function hasAccess(session: Session, access: Access): boolean {
  switch (access) {
    case "anyone":
    case "signedIn":
      return true;
    case "technician":
      return session.roles.includes("technician");
    case "admin":
      return isAdmin(session.roles);
  }
}

/**
 * 頁面保護（伺服器端，主要的關卡）。會員、師傅、後台的版面和頁面都要呼叫。
 * - 不用登入的頁面：直接通過。
 * - 沒登入、或還沒補完稱呼和條款：轉到登入頁，登入後回到 path。
 * - 角色不對：404（不透露頁面存在）。
 */
export async function requireAccess(access: Access, path: string): Promise<Session | null> {
  // 不用登入的頁面不查登入狀態（少一次連到 Supabase）
  if (access === "anyone") return null;
  const session = await getSession();
  const locale = await getLocale();
  if (!session || session.needsProfile) {
    redirect({ href: { pathname: "/login", query: { next: path } }, locale });
  }
  if (!hasAccess(session!, access)) notFound();
  return session;
}

/** 登入後要去的頁面（不含語言）：?next= 合格而且有權限就回去，不然依角色的首頁。 */
export function destinationFor(session: Session, next: string | null | undefined): string {
  const path = safeNextPath(next);
  const route = path ? matchRoute(path) : null;
  if (path && route && hasAccess(session, accessFor(route.key))) return path;
  return routeHref(landingRoute(session.roles));
}
