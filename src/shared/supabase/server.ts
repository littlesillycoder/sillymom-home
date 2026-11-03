import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/shared/config/env";

/** 伺服器端（Server Component、Route Handler）用的 Supabase 連線，以目前使用者的身分存取，受 Row Level Security 限制。 */
export async function createClient() {
  const { url, publishableKey } = getSupabasePublicConfig();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // 在 Server Component 裡不能寫 cookie；登入狀態更新交給之後的 middleware 處理。
        }
      },
    },
  });
}
