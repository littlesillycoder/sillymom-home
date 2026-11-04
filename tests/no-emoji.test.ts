import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 網站上不使用 emoji（CLAUDE.md 設計規則）。
 * 掃描 src/ 的程式碼、樣式和語言檔。測試檔本身不掃（這裡要放 emoji 來測試）。
 */
const ROOT = join(__dirname, "..");
const EXTENSIONS = [".ts", ".tsx", ".css", ".json"];
// Extended_Pictographic 涵蓋 emoji；© ® ™ 這類一般符號另外允許。
const EMOJI = /(?![©®™])\p{Extended_Pictographic}|\u{fe0f}/u;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return EXTENSIONS.some((ext) => name.endsWith(ext)) && !name.endsWith(".test.ts") ? [path] : [];
  });
}

describe("沒有 emoji", () => {
  it("偵測規則抓得到 emoji、不會誤抓一般符號", () => {
    expect(EMOJI.test("修好了 \u{1F44D}")).toBe(true);
    expect(EMOJI.test("❤️")).toBe(true);
    expect(EMOJI.test("← 回首頁 · NT$150 ／ ✓")).toBe(false);
  });

  it("src/ 裡沒有 emoji", () => {
    const found = files(join(ROOT, "src")).flatMap((path) =>
      readFileSync(path, "utf8")
        .split("\n")
        .flatMap((line, i) => (EMOJI.test(line) ? [`${relative(ROOT, path)}:${i + 1}`] : [])),
    );
    expect(found).toEqual([]);
  });
});
