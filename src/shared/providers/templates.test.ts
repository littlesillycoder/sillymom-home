import { describe, expect, it } from "vitest";
import en from "@/shared/i18n/messages/en.json";
import zhTW from "@/shared/i18n/messages/zh-TW.json";
import { NOTIFY_TEMPLATES, renderNotification, renderVerificationCode } from "./templates";

const CASE = "3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b";

describe("通知範本", () => {
  it("每個範本都有繁中和英文", () => {
    for (const template of NOTIFY_TEMPLATES) {
      expect(zhTW.providerTemplates[template].text).toBeTruthy();
      expect(en.providerTemplates[template].text).toBeTruthy();
    }
  });

  it("依收件人的語言送出", () => {
    const zh = renderNotification("videoStartingSoon", "zh-TW", { caseId: CASE, time: "15:30" });
    const english = renderNotification("videoStartingSoon", "en", { caseId: CASE, time: "15:30" });
    expect(zh.text).toContain("15:30");
    expect(zh.text).toContain(CASE);
    expect(english.text).toMatch(/starts at 15:30/);
    expect(english.text).not.toBe(zh.text);
  });

  it("驗證碼簡訊兩種語言都有驗證碼", () => {
    expect(renderVerificationCode("zh-TW", "123456")).toContain("123456");
    expect(renderVerificationCode("en", "123456")).toContain("123456");
  });
});
