import { describe, expect, it } from "vitest";
import { isHealthCheckEnabled, parseAppEnv } from "./env";

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
