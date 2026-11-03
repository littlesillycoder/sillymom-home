import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/shared/config/env";

/** 瀏覽器端（Client Component）用的 Supabase 連線，受 Row Level Security 限制。 */
export function createClient() {
  const { url, publishableKey } = getSupabasePublicConfig();
  return createBrowserClient(url, publishableKey);
}
