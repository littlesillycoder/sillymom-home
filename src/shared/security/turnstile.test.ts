import { afterEach, describe, expect, it, vi } from "vitest";
import { TURNSTILE_TEST_KEYS } from "@/shared/config/env";
import { verifyTurnstile, type VerifyTurnstileInput } from "./turnstile";

/** Cloudflare 文件上的測試用 token：搭配測試密鑰使用 */
const DUMMY_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";
const base = {
  token: DUMMY_TOKEN,
  expectedAction: "appeal",
  expectedHostname: "sillymomhome.com",
  appEnv: "development",
} satisfies VerifyTurnstileInput;

function fakeFetch(body: unknown, init: { status?: number } = {}) {
  return vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status: init.status ?? 200,
        headers: { "content-type": "application/json" },
      }),
  );
}

afterEach(() => vi.restoreAllMocks());

describe("Turnstile 伺服器端驗證：用 Cloudflare 官方測試金鑰（真的呼叫 Cloudflare）", () => {
  it("一定通過的密鑰 → 通過", async () => {
    const r = await verifyTurnstile({
      ...base,
      secretKey: TURNSTILE_TEST_KEYS.secretKey.alwaysPasses,
    });
    expect(r).toEqual({ ok: true });
  }, 15_000);

  it("一定失敗的密鑰 → 不通過", async () => {
    const r = await verifyTurnstile({
      ...base,
      secretKey: TURNSTILE_TEST_KEYS.secretKey.alwaysFails,
    });
    expect(r).toEqual({ ok: false, reason: "invalid-token" });
  }, 15_000);

  it("token 已經用過的密鑰 → 不通過（同一個 token 不能用兩次）", async () => {
    const r = await verifyTurnstile({
      ...base,
      secretKey: TURNSTILE_TEST_KEYS.secretKey.alreadySpent,
    });
    expect(r).toEqual({ ok: false, reason: "invalid-token" });
  }, 15_000);

  it("正式環境就算拿到測試金鑰的通過結果，也不通過", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = await verifyTurnstile({
      ...base,
      appEnv: "production",
      secretKey: TURNSTILE_TEST_KEYS.secretKey.alwaysPasses,
    });
    expect(r).toEqual({ ok: false, reason: "testing-key-in-production" });
  }, 15_000);
});

describe("Turnstile 伺服器端驗證：各種情況（模擬 Cloudflare 回應）", () => {
  const real = { success: true, action: "appeal", hostname: "sillymomhome.com" };

  it("用途和網站名稱都對 → 通過，並把 IP 一起送給 Cloudflare", async () => {
    const fetchImpl = fakeFetch(real);
    const r = await verifyTurnstile({
      ...base,
      secretKey: "s",
      fetchImpl,
      remoteIp: "203.0.113.5",
    });
    expect(r).toEqual({ ok: true });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    expect(init.method).toBe("POST");
    const sent = init.body as URLSearchParams;
    expect(sent.get("response")).toBe(DUMMY_TOKEN);
    expect(sent.get("remoteip")).toBe("203.0.113.5");
  });

  it("別的表單的 token（用途不同）→ 不通過", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchImpl = fakeFetch({ ...real, action: "signup" });
    expect(await verifyTurnstile({ ...base, secretKey: "s", fetchImpl })).toEqual({
      ok: false,
      reason: "action-mismatch",
    });
  });

  it("別的網站拿到的 token（網站名稱不同）→ 不通過", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchImpl = fakeFetch({ ...real, hostname: "evil.example" });
    expect(await verifyTurnstile({ ...base, secretKey: "s", fetchImpl })).toEqual({
      ok: false,
      reason: "hostname-mismatch",
    });
  });

  it.each([
    ["沒有 token", null],
    ["空字串", ""],
    ["檔案而不是文字", new File(["x"], "x.txt")],
  ])("%s → 不通過，也不會呼叫 Cloudflare", async (_, token) => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchImpl = fakeFetch(real);
    const r = await verifyTurnstile({ ...base, token, secretKey: "s", fetchImpl });
    expect(r).toEqual({ ok: false, reason: "missing-token" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("超長的 token → 不通過，也不會呼叫 Cloudflare", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchImpl = fakeFetch(real);
    const r = await verifyTurnstile({
      ...base,
      token: "x".repeat(3000),
      secretKey: "s",
      fetchImpl,
    });
    expect(r).toEqual({ ok: false, reason: "invalid-token" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("逾時 → 當作不通過（擋下，不放行）", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchImpl = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    const r = await verifyTurnstile({ ...base, secretKey: "s", fetchImpl, timeoutMs: 50 });
    expect(r).toEqual({ ok: false, reason: "unavailable" });
  });

  it.each([
    ["連線失敗", vi.fn(async () => Promise.reject(new Error("network down")))],
    ["Cloudflare 回 500", fakeFetch({}, { status: 500 })],
    ["回傳不是 JSON", vi.fn(async () => new Response("<html>"))],
    ["success 不是 true", fakeFetch({ success: "true" })],
  ])("%s → 當作不通過", async (_, fetchImpl) => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = await verifyTurnstile({ ...base, secretKey: "s", fetchImpl });
    expect(r.ok).toBe(false);
  });

  it("不通過時 log 只記原因和用途，不記 token", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await verifyTurnstile({ ...base, secretKey: "s", fetchImpl: fakeFetch({ success: false }) });
    const line = spy.mock.calls[0][0] as string;
    expect(line).not.toContain(DUMMY_TOKEN);
    expect(JSON.parse(line)).toMatchObject({
      event: "turnstile.failed",
      data: { reason: "invalid-token", action: "appeal" },
    });
  });

  it("程式寫錯的用途代號直接報錯（不是使用者的問題）", async () => {
    await expect(verifyTurnstile({ ...base, expectedAction: "有中文" })).rejects.toThrow();
  });
});
