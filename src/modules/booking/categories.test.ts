import { describe, expect, it } from "vitest";
import en from "@/shared/i18n/messages/en.json";
import zhTW from "@/shared/i18n/messages/zh-TW.json";
import { SERVICE_CATEGORIES } from "./categories";

describe("服務類別", () => {
  it("12 個類別，代號不重複", () => {
    expect(SERVICE_CATEGORIES).toHaveLength(12);
    expect(new Set(SERVICE_CATEGORIES).size).toBe(12);
  });

  it.each([
    ["zh-TW", zhTW],
    ["en", en],
  ])("%s 語言檔每個類別都有名稱，沒有多餘的", (_, messages) => {
    expect(Object.keys(messages.serviceCategories).sort()).toEqual([...SERVICE_CATEGORIES].sort());
  });
});
