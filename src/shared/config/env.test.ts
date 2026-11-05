import { afterEach, describe, expect, it } from "vitest";
import {
  getTurnstileSecretKey,
  getTurnstileSiteKey,
  isHealthCheckEnabled,
  parseAppEnv,
  TURNSTILE_TEST_KEYS,
} from "./env";

describe("parseAppEnv", () => {
  it("認得四種環境", () => {
    expect(parseAppEnv("development")).toBe("development");
    expect(parseAppEnv("preview")).toBe("preview");
    expect(parseAppEnv("demo")).toBe("demo");
    expect(parseAppEnv("production")).toBe("production");
  });

  it("沒設定或設定錯誤時當成 production", () => {
    expect(parseAppEnv(undefined)).toBe("production");
    expect(parseAppEnv("")).toBe("production");
    expect(parseAppEnv("dev")).toBe("production");
  });
});

describe("isHealthCheckEnabled", () => {
  it("只在 development、preview 開啟", () => {
    expect(isHealthCheckEnabled("development")).toBe(true);
    expect(isHealthCheckEnabled("preview")).toBe(true);
    expect(isHealthCheckEnabled("demo")).toBe(false);
    expect(isHealthCheckEnabled("production")).toBe(false);
  });
});

describe("Turnstile 金鑰", () => {
  const ORIGINAL = { ...process.env };
  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it("開發、預覽、展示沒設定時用一定通過的測試金鑰", () => {
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    delete process.env.TURNSTILE_SECRET_KEY;
    for (const env of ["development", "preview", "demo"] as const) {
      expect(getTurnstileSiteKey(env)).toBe(TURNSTILE_TEST_KEYS.siteKey.alwaysPasses);
      expect(getTurnstileSecretKey(env)).toBe(TURNSTILE_TEST_KEYS.secretKey.alwaysPasses);
    }
  });

  it("正式環境沒設定 → 報錯", () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    expect(() => getTurnstileSecretKey("production")).toThrow(/TURNSTILE_SECRET_KEY/);
  });

  it.each([
    TURNSTILE_TEST_KEYS.secretKey.alwaysPasses,
    TURNSTILE_TEST_KEYS.secretKey.alwaysFails,
    TURNSTILE_TEST_KEYS.secretKey.alreadySpent,
  ])("正式環境設成測試金鑰（%s）→ 報錯", (key) => {
    process.env.TURNSTILE_SECRET_KEY = key;
    expect(() => getTurnstileSecretKey("production")).toThrow(/測試金鑰/);
  });

  it("正式環境的網站金鑰也不能是測試金鑰", () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = TURNSTILE_TEST_KEYS.siteKey.alwaysPasses;
    expect(() => getTurnstileSiteKey("production")).toThrow(/測試金鑰/);
  });

  it("正式環境設成真的金鑰 → 使用", () => {
    process.env.TURNSTILE_SECRET_KEY = "0x4AAAAAAAreal-secret-value";
    expect(getTurnstileSecretKey("production")).toBe("0x4AAAAAAAreal-secret-value");
  });
});
