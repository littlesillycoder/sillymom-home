import { describe, expect, it } from "vitest";
import en from "./messages/en.json";
import zhTW from "./messages/zh-TW.json";

function keys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v !== null && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe("語言檔", () => {
  it("繁中和英文的項目完全相同（避免切換語言時漏字）", () => {
    expect(keys(en).sort()).toEqual(keys(zhTW).sort());
  });

  it("沒有空白的文字", () => {
    for (const [name, file] of [
      ["zh-TW", zhTW],
      ["en", en],
    ] as const) {
      const flat = JSON.stringify(file);
      expect(flat, name).not.toContain('""');
    }
  });
});
