import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: async () => {} }));

const createAdminClient = vi.fn();
vi.mock("@/shared/supabase/admin", () => ({ createAdminClient }));

const { GET } = await import("./route");

afterEach(() => {
  vi.unstubAllEnvs();
  createAdminClient.mockReset();
});

describe("GET /health", () => {
  for (const appEnv of ["demo", "production", "", "unknown"]) {
    it(`APP_ENV=${JSON.stringify(appEnv)} 時回 404，也不連資料庫`, async () => {
      vi.stubEnv("APP_ENV", appEnv);
      const res = await GET();
      expect(res.status).toBe(404);
      expect(createAdminClient).not.toHaveBeenCalled();
    });
  }

  it("development 時讀寫資料庫並回 ok，不包含金鑰", async () => {
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_should_not_leak");
    const row = { data: { checked_at: "2026-11-03T00:00:00Z" }, error: null };
    const query = {
      upsert: () => query,
      select: () => query,
      eq: () => query,
      single: async () => row,
    };
    createAdminClient.mockReturnValue({ from: () => query });

    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      status: "ok",
      appEnv: "development",
      supabase: { host: "abc.supabase.co", write: "ok", read: "ok" },
    });
    expect(JSON.stringify(body)).not.toContain("sb_secret");
  });

  it("資料庫錯誤時回 503", async () => {
    vi.stubEnv("APP_ENV", "preview");
    const query = {
      upsert: () => query,
      select: () => query,
      single: async () => ({ data: null, error: { message: "permission denied" } }),
    };
    createAdminClient.mockReturnValue({ from: () => query });

    const res = await GET();
    expect(res.status).toBe(503);
    expect((await res.json()).status).toBe("error");
  });
});
