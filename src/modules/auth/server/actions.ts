"use server";

import { log } from "@/shared/log";
import { createClient } from "@/shared/supabase/server";
import { destinationFor, getSession } from "./session";

export type FinishLoginInput = {
  displayName?: string;
  agreed?: boolean;
  next?: string | null;
};

export type FinishLoginResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: "notSignedIn" | "needProfile" | "invalidName" | "failed" };

/** 稱呼：1～20 字，不能有控制字元、角括號（避免被當成 HTML 或亂碼）。 */
function cleanDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  if (name.length < 1 || [...name].length > 20) return null;
  if (/[\u0000-\u001f\u007f<>]/.test(name)) return null;
  return name;
}

/**
 * 驗證碼通過之後（瀏覽器已經有登入狀態）呼叫。
 * - 第一次使用（還沒有稱呼或還沒同意目前版本的條款）：一定要填稱呼、勾同意，記下同意紀錄。
 * - 回傳登入後要去的頁面：?next= 合格而且有權限就回去，不然依角色的首頁。
 * 驗證碼通過之前不會判斷帳號是不是新的（別人不能用手機號碼查帳號存不存在）。
 */
export async function finishLogin(input: FinishLoginInput): Promise<FinishLoginResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "notSignedIn" };

  if (session.needsProfile) {
    if (input.agreed !== true) return { ok: false, error: "needProfile" };
    const name = cleanDisplayName(input.displayName);
    if (!name) return { ok: false, error: "invalidName" };

    // 用使用者自己的連線寫入，受 RLS 限制（只能寫自己的、目前版本的條款）
    const supabase = await createClient();
    const { data: version, error: versionError } = await supabase.rpc("current_terms_version");
    if (versionError || !version) {
      log.error("auth.terms_version_missing", versionError);
      return { ok: false, error: "failed" };
    }
    const terms = await supabase.from("terms_acceptances").upsert(
      [
        { document: "terms", version },
        { document: "privacy", version },
      ],
      { onConflict: "user_id,document,version", ignoreDuplicates: true },
    );
    const profile = await supabase
      .from("customers")
      .update({ display_name: name })
      .eq("user_id", session.userId);
    if (terms.error || profile.error) {
      log.error("auth.finish_profile_failed", terms.error ?? profile.error);
      return { ok: false, error: "failed" };
    }
  }

  return { ok: true, redirectTo: destinationFor(session, input.next) };
}
