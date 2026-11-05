import "server-only";
import { Webhook } from "standardwebhooks";
import { getSendSmsHookSecret } from "@/shared/config/env";
import { getRegion, isLocale, type Locale } from "@/shared/config/regions";
import { log } from "@/shared/log";
import { getSmsProvider } from "@/shared/providers/sms";
import { createAdminClient } from "@/shared/supabase/admin";
import { normalizePhone } from "../phone";

/**
 * Supabase Auth 的 Send SMS Hook（#11）：Supabase 產生驗證碼後交給我們，用簡訊介面（#4）送出。
 *
 * 資安：
 * - 一定要驗證 Supabase 的簽章（Standard Webhooks，官方套件 standardwebhooks）：簽章不對、時間過期、
 *   內容被改過一律拒絕，不送簡訊，避免別人透過我們發簡訊。
 * - 密鑰沒設定 → 404（跟其他 /internal/... 網址一樣，不透露網址存在）。
 * - log 不記驗證碼、完整手機號碼（簡訊介面寫紀錄時也會遮蔽，#4）。
 */

const MAX_BODY_BYTES = 16 * 1024;

type HookPayload = { user: { id: string; phone: string }; sms: { otp: string } };

function parsePayload(value: unknown): HookPayload | null {
  if (value === null || typeof value !== "object") return null;
  const { user, sms } = value as { user?: unknown; sms?: unknown };
  if (user === null || typeof user !== "object" || sms === null || typeof sms !== "object") {
    return null;
  }
  const { id, phone } = user as { id?: unknown; phone?: unknown };
  const { otp } = sms as { otp?: unknown };
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id)) return null;
  if (typeof phone !== "string" || typeof otp !== "string" || !/^\d{4,10}$/.test(otp)) return null;
  return { user: { id, phone }, sms: { otp } };
}

/** Supabase 要求的錯誤格式 */
function hookError(status: number, message: string) {
  return Response.json({ error: { http_code: status, message } }, { status });
}

async function recipientLocale(userId: string): Promise<Locale> {
  const fallback = getRegion().defaultLocale;
  try {
    const { data } = await createAdminClient()
      .from("customers")
      .select("locale")
      .eq("user_id", userId)
      .maybeSingle();
    return isLocale(data?.locale) ? data.locale : fallback;
  } catch {
    return fallback;
  }
}

export async function handleSendSmsHook(request: Request): Promise<Response> {
  const secret = getSendSmsHookSecret();
  if (!secret) return new Response(null, { status: 404 });

  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_BODY_BYTES) return hookError(413, "payload too large");
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) return hookError(413, "payload too large");

  let verified: unknown;
  try {
    const webhook = new Webhook(secret.replace(/^v1,whsec_/, ""));
    verified = webhook.verify(body, {
      "webhook-id": request.headers.get("webhook-id") ?? "",
      "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
      "webhook-signature": request.headers.get("webhook-signature") ?? "",
    });
  } catch {
    log.warn("auth.send_sms_hook_rejected", { reason: "signature" });
    return hookError(401, "invalid signature");
  }

  const payload = parsePayload(verified);
  const phone = payload ? normalizePhone(payload.user.phone) : null;
  if (!payload || !phone) {
    log.warn("auth.send_sms_hook_rejected", { reason: "payload" });
    return hookError(400, "invalid payload");
  }

  try {
    const locale = await recipientLocale(payload.user.id);
    await getSmsProvider().sendVerificationCode({ phone, code: payload.sms.otp, locale });
    return Response.json({});
  } catch (error) {
    // 只記錯誤類型：簡訊服務的錯誤訊息可能帶著驗證碼（6 位數字不在 log 的遮蔽格式裡）
    log.error("auth.send_sms_failed", undefined, {
      errorName: error instanceof Error ? error.name : "NonError",
    });
    return hookError(500, "failed to send sms");
  }
}
