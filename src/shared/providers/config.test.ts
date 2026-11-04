import { describe, expect, it } from "vitest";
import { REGIONS } from "@/shared/config/regions";
import { ProviderConfigError, resolveImplementation } from "./config";

const region = REGIONS.tw;

describe("選擇外部服務實作", () => {
  it("開發、預覽、展示沒設定時用 mock", () => {
    for (const appEnv of ["development", "preview", "demo"] as const) {
      expect(resolveImplementation("payment", { env: {}, appEnv, region })).toBe("mock");
    }
  });

  it("改環境變數就能切換", () => {
    expect(
      resolveImplementation("sms", {
        env: { SMS_PROVIDER: "every8d" },
        appEnv: "development",
        region,
      }),
    ).toBe("every8d");
    expect(
      resolveImplementation("notify", {
        env: { NOTIFY_PROVIDER: "line" },
        appEnv: "production",
        region,
      }),
    ).toBe("line");
  });

  it("不在地區允許清單裡 → 報錯", () => {
    expect(() =>
      resolveImplementation("payment", {
        env: { PAYMENT_PROVIDER: "stripe" },
        appEnv: "development",
        region,
      }),
    ).toThrow(ProviderConfigError);
  });

  it("正式環境沒設定 → 報錯", () => {
    expect(() =>
      resolveImplementation("invoice", { env: {}, appEnv: "production", region }),
    ).toThrow(ProviderConfigError);
  });

  it("正式環境設成 mock → 報錯（不會假裝成功）", () => {
    for (const service of ["payment", "invoice", "sms", "notify"] as const) {
      const name = {
        payment: "PAYMENT_PROVIDER",
        invoice: "INVOICE_PROVIDER",
        sms: "SMS_PROVIDER",
        notify: "NOTIFY_PROVIDER",
      }[service];
      expect(() =>
        resolveImplementation(service, { env: { [name]: "mock" }, appEnv: "production", region }),
      ).toThrow(ProviderConfigError);
    }
  });
});
