import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: async () => {} }));
const purgeExpiredProviderLogs = vi.fn();
vi.mock("@/shared/maintenance/purge", () => ({ purgeExpiredProviderLogs }));

const { POST } = await import("./route");
const SECRET = "s".repeat(40);
const req = (auth?: string) =>
  new Request("http://localhost/internal/maintenance", {
    method: "POST",
    headers: auth ? { authorization: auth } : {},
  });

afterEach(() => {
  vi.unstubAllEnvs();
  purgeExpiredProviderLogs.mockReset();
});

describe("POST /internal/maintenance", () => {
  it.each([
    ["沒設定密碼", "", `Bearer ${SECRET}`],
    ["密碼錯誤", SECRET, "Bearer wrong"],
    ["沒帶密碼", SECRET, undefined],
  ])("%s → 404，不刪除", async (_, secret, auth) => {
    vi.stubEnv("EVENTS_CRON_SECRET", secret);
    expect((await POST(req(auth))).status).toBe(404);
    expect(purgeExpiredProviderLogs).not.toHaveBeenCalled();
  });

  it("密碼正確 → 刪除過期紀錄，回應只有筆數", async () => {
    vi.stubEnv("EVENTS_CRON_SECRET", SECRET);
    purgeExpiredProviderLogs.mockResolvedValue(3);
    const res = await POST(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ providerLogsDeleted: 3 });
  });
});
