"use server";

import { getLocale } from "next-intl/server";
import { redirect } from "@/shared/i18n/navigation";
import { createClient } from "./server";

/**
 * 登出（#11）：只能用 POST（表單送 Server Action），不能用連結（GET），
 * 避免別的網站用一個連結就讓使用者被登出。只登出這台裝置；「登出所有裝置」在 #33。
 * Server Action 由 Next.js 檢查來源網域（Origin），別的網站送不進來。
 */
export async function signOut() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // 沒有 Supabase 設定或已經登出：一樣回首頁
  }
  redirect({ href: "/", locale: await getLocale() });
}
