import { handleSendSmsHook } from "@/modules/auth/server";

/**
 * Supabase Auth 的 Send SMS Hook（#11）。只接受 POST；一定要通過 Supabase 的簽章驗證。
 * 在 Supabase 後台 Authentication → Hooks 設定這個網址和密鑰（SUPABASE_SEND_SMS_HOOK_SECRET）。
 */
export async function POST(request: Request) {
  return handleSendSmsHook(request);
}
