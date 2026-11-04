import { describe, expect, it } from "vitest";
import { localeFromAcceptLanguage } from "./accept-language";

describe("依瀏覽器語言決定第一次進網站的語言", () => {
  it.each([
    ["zh-TW", "zh-TW"],
    ["zh-HK", "zh-TW"],
    ["zh-CN", "zh-TW"],
    ["zh", "zh-TW"],
    ["zh-Hant-TW,zh;q=0.9", "zh-TW"],
    ["en-US", "en"],
    ["en", "en"],
    ["ja", "en"],
    ["fr-FR,fr;q=0.9", "en"],
  ])("%s → %s", (header, expected) => {
    expect(localeFromAcceptLanguage(header)).toBe(expected);
  });

  it("看第一順位：en-US,zh-TW;q=0.9 → 英文", () => {
    expect(localeFromAcceptLanguage("en-US,zh-TW;q=0.9")).toBe("en");
  });

  it("看權重：zh-TW;q=0.5,en;q=0.9 → 英文", () => {
    expect(localeFromAcceptLanguage("zh-TW;q=0.5,en;q=0.9")).toBe("en");
  });

  it("權重 0 的語言不算", () => {
    expect(localeFromAcceptLanguage("en;q=0,zh-TW;q=0.5")).toBe("zh-TW");
  });

  it.each([null, undefined, "", "   ", "*", ";;;", "<script>", "en;q=abc", "en;q=2"])(
    "沒送、空白、格式不對 → 繁中：%j",
    (header) => {
      expect(localeFromAcceptLanguage(header)).toBe("zh-TW");
    },
  );

  it("資安：超長的標頭只讀前面，不會拖慢", () => {
    const huge = "x-".repeat(100_000) + ",en";
    const start = performance.now();
    expect(localeFromAcceptLanguage(huge)).toBe("zh-TW");
    expect(performance.now() - start).toBeLessThan(50);
  });

  it("資安：很多個語言只看前 20 個", () => {
    const many = Array.from({ length: 30 }, (_, i) => `xx-${i};q=0.1`).join(",") + ",en";
    expect(localeFromAcceptLanguage(many)).toBe("en");
    const manyThenZh = Array.from({ length: 25 }, () => "ja;q=0.1").join(",") + ",zh-TW";
    expect(localeFromAcceptLanguage(manyThenZh)).toBe("en");
  });
});
