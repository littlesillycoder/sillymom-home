import { describe, expect, it } from "vitest";
import { safeNextPath } from "./next-path";
import { formatLocalPhone, normalizePhone } from "./phone";
import { landingRoute } from "./roles";

describe("手機號碼整理", () => {
  it.each([
    "0912345678",
    "0912-345-678",
    "0912 345 678",
    "912 345 678",
    "912345678",
    "+886912345678",
    "+886 912 345 678",
    "886912345678",
    "+886 0912 345 678",
  ])("%s → +886912345678", (input) => {
    expect(normalizePhone(input)).toBe("+886912345678");
  });

  it.each([
    ["市話", "0227001234"],
    ["少一碼", "091234567"],
    ["多一碼", "09123456789"],
    ["別的國碼", "+81912345678"],
    ["有英文", "0912abc678"],
    ["空白", ""],
    ["太長", "0".repeat(40)],
    ["注入字元", "0912345678;--"],
  ])("%s 不接受", (_, input) => {
    expect(normalizePhone(input)).toBeNull();
  });

  it("畫面顯示不含國碼", () => {
    expect(formatLocalPhone("+886912345678")).toBe("912 345 678");
  });
});

describe("登入後回去的頁面", () => {
  it.each([
    ["/dashboard", "/dashboard"],
    ["/records?tab=video", "/records"],
    ["/tech/schedule#today", "/tech/schedule"],
    ["/admin/settings", "/admin/settings"],
  ])("%s → %s", (next, expected) => {
    expect(safeNextPath(next)).toBe(expected);
  });

  it.each([
    ["別的網站", "https://evil.example/dashboard"],
    ["// 開頭（瀏覽器會當成別的網站）", "//evil.example"],
    ["反斜線", "/\\evil.example"],
    ["不在清單上", "/nope"],
    ["登入頁本身", "/login"],
    ["沒有 / 開頭", "dashboard"],
    ["javascript", "javascript:alert(1)"],
    ["換行", "/dashboard\nLocation: https://evil.example"],
    ["空", ""],
    ["沒有", null],
  ])("%s 不接受", (_, next) => {
    expect(safeNextPath(next)).toBeNull();
  });
});

describe("依角色導向", () => {
  it.each([
    [["customer"], "dashboard"],
    [["customer", "technician"], "techHome"],
    [["customer", "support"], "admin"],
    [["customer", "technician", "owner"], "admin"],
    [[], "dashboard"],
  ])("%j → %s", (roles, expected) => {
    expect(landingRoute(roles)).toBe(expected);
  });
});
