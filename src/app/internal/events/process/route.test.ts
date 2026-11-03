import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: async () => {} }));
const runEventProcessing = vi.fn();
vi.mock("@/shared/events/server", () => ({ runEventProcessing }));

const { POST } = await import("./route");
const SECRET = "s".repeat(40);

function req(auth?: string) {
  return new Request("http://localhost/internal/events/process", {
    method: "POST",
    headers: auth ? { authorization: auth } : {},
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  runEventProcessing.mockReset();
});

describe("POST /internal/events/process", () => {
  it("沒設定密碼時回 404", async () => {
    vi.stubEnv("EVENTS_CRON_SECRET", "");
    expect((await POST(req(`Bearer ${SECRET}`))).status).toBe(404);
    expect(runEventProcessing).not.toHaveBeenCalled();
  });

  it("密碼太短當成沒設定，回 404", async () => {
    vi.stubEnv("EVENTS_CRON_SECRET", "short");
    expect((await POST(req("Bearer short"))).status).toBe(404);
    expect(runEventProcessing).not.toHaveBeenCalled();
  });

  it.each([undefined, "Bearer wrong", `Basic ${SECRET}`, `Bearer ${SECRET}x`])(
    "密碼錯誤（%s）回 404",
    async (auth) => {
      vi.stubEnv("EVENTS_CRON_SECRET", SECRET);
      expect((await POST(req(auth))).status).toBe(404);
      expect(runEventProcessing).not.toHaveBeenCalled();
    },
  );

  it("密碼正確時處理事件，回應只有筆數", async () => {
    vi.stubEnv("EVENTS_CRON_SECRET", SECRET);
    runEventProcessing.mockResolvedValue({
      fannedOut: 1,
      claimed: 1,
      done: 1,
      retried: 0,
      failed: 0,
    });
    const res = await POST(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ fannedOut: 1, claimed: 1, done: 1, retried: 0, failed: 0 });
  });
});
