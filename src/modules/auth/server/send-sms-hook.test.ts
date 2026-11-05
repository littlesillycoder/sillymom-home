import { Webhook } from "standardwebhooks";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendVerificationCode = vi.fn(async () => {});
vi.mock("@/shared/providers/sms", () => ({
  getSmsProvider: () => ({ implementation: "mock", sendVerificationCode }),
}));
vi.mock("@/shared/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { locale: "en" }, error: null }) }),
      }),
    }),
  }),
}));

const { handleSendSmsHook } = await import("./send-sms-hook");

const SECRET_RAW = Buffer.from("test-secret-for-send-sms-hook-0123456789").toString("base64");
const SECRET = `v1,whsec_${SECRET_RAW}`;
const USER_ID = "3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b";
const payload = { user: { id: USER_ID, phone: "886912345678" }, sms: { otp: "482913" } };

function signedRequest(
  body: unknown,
  {
    secret = SECRET_RAW,
    at = new Date(),
    tamper,
  }: { secret?: string; at?: Date; tamper?: string } = {},
) {
  const text = JSON.stringify(body);
  const id = `msg_${crypto.randomUUID()}`;
  const signature = new Webhook(secret).sign(id, at, text);
  return new Request("http://localhost/internal/auth/send-sms", {
    method: "POST",
    body: tamper ?? text,
    headers: {
      "content-type": "application/json",
      "webhook-id": id,
      "webhook-timestamp": String(Math.floor(at.getTime() / 1000)),
      "webhook-signature": signature,
    },
  });
}

beforeEach(() => {
  process.env.SUPABASE_SEND_SMS_HOOK_SECRET = SECRET;
  sendVerificationCode.mockClear();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  delete process.env.SUPABASE_SEND_SMS_HOOK_SECRET;
  vi.restoreAllMocks();
});

describe("Send SMS Hook", () => {
  it("簽章正確 → 用簡訊介面送出驗證碼（國際格式、收件人的語言）", async () => {
    const res = await handleSendSmsHook(signedRequest(payload));
    expect(res.status).toBe(200);
    expect(sendVerificationCode).toHaveBeenCalledWith({
      phone: "+886912345678",
      code: "482913",
      locale: "en",
    });
  });

  it("密鑰沒設定 → 404，不透露網址存在", async () => {
    delete process.env.SUPABASE_SEND_SMS_HOOK_SECRET;
    const res = await handleSendSmsHook(signedRequest(payload));
    expect(res.status).toBe(404);
    expect(sendVerificationCode).not.toHaveBeenCalled();
  });

  it("用別的密鑰簽 → 401，不送簡訊", async () => {
    const other = Buffer.from("another-secret-value-9876543210-abcdef").toString("base64");
    const res = await handleSendSmsHook(signedRequest(payload, { secret: other }));
    expect(res.status).toBe(401);
    expect(sendVerificationCode).not.toHaveBeenCalled();
  });

  it("內容被改過（換成別的手機號碼）→ 401，不送簡訊", async () => {
    const tampered = JSON.stringify({
      ...payload,
      user: { ...payload.user, phone: "886987654321" },
    });
    const res = await handleSendSmsHook(signedRequest(payload, { tamper: tampered }));
    expect(res.status).toBe(401);
    expect(sendVerificationCode).not.toHaveBeenCalled();
  });

  it("太久以前簽的（重送舊的請求）→ 401", async () => {
    const old = new Date(Date.now() - 60 * 60 * 1000);
    const res = await handleSendSmsHook(signedRequest(payload, { at: old }));
    expect(res.status).toBe(401);
    expect(sendVerificationCode).not.toHaveBeenCalled();
  });

  it("沒有簽章 → 401", async () => {
    const res = await handleSendSmsHook(
      new Request("http://localhost/internal/auth/send-sms", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
    expect(res.status).toBe(401);
  });

  it.each([
    ["不是台灣手機", { ...payload, user: { ...payload.user, phone: "14155550100" } }],
    ["驗證碼格式不對", { ...payload, sms: { otp: "abc" } }],
    ["缺少使用者", { sms: payload.sms }],
  ])("簽章正確但%s → 400，不送簡訊", async (_, body) => {
    const res = await handleSendSmsHook(signedRequest(body));
    expect(res.status).toBe(400);
    expect(sendVerificationCode).not.toHaveBeenCalled();
  });

  it("太大的內容 → 413", async () => {
    const res = await handleSendSmsHook(signedRequest({ ...payload, padding: "x".repeat(20_000) }));
    expect(res.status).toBe(413);
  });

  it("簡訊送不出去 → 500（Supabase 會告訴使用者失敗），log 不記驗證碼和完整手機", async () => {
    sendVerificationCode.mockRejectedValueOnce(
      new Error("send to +886912345678 code 482913 failed"),
    );
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await handleSendSmsHook(signedRequest(payload));
    expect(res.status).toBe(500);
    const logged = errors.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logged).not.toContain("912345678");
    expect(logged).not.toContain("482913");
  });
});
