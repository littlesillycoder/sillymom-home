import { describe, expect, it } from "vitest";
import {
  addMoney,
  compareMoney,
  formatMoney,
  money,
  MoneyError,
  multiplyMoney,
  subtractMoney,
  toDbAmount,
} from "./money";

describe("顯示金額", () => {
  it("台幣顯示 NT$，不顯示小數", () => {
    expect(formatMoney(money("150", "TWD"), "zh-TW")).toBe("NT$150");
    expect(formatMoney(money(150, "TWD"), "en")).toBe("NT$150");
    expect(formatMoney(money("1234567", "TWD"), "zh-TW")).toBe("NT$1,234,567");
    expect(formatMoney(money("-100", "TWD"), "zh-TW")).toBe("-NT$100");
  });

  it("歐元顯示 €，有小數才顯示兩位", () => {
    expect(formatMoney(money("150", "EUR"), "en")).toBe("€150");
    expect(formatMoney(money("150.50", "EUR"), "en")).toBe("€150.50");
    expect(formatMoney(money("150.5", "EUR"), "zh-TW")).toBe("€150.50");
    expect(formatMoney(money("0.05", "EUR"), "en")).toBe("€0.05");
  });
});

describe("金額計算沒有小數誤差", () => {
  it("0.1 + 0.2 = 0.30", () => {
    expect(addMoney(money("0.1", "EUR"), money("0.2", "EUR")).amount).toBe("0.30");
  });

  it("平台費扣掉抵用金", () => {
    const fee = money("150", "TWD");
    const credit = money("100", "TWD");
    expect(subtractMoney(fee, credit)).toEqual({ amount: "50.00", currency: "TWD" });
  });

  it("乘以數量", () => {
    expect(multiplyMoney(money("19.99", "EUR"), 3).amount).toBe("59.97");
    expect(() => multiplyMoney(money("1", "EUR"), 1.5)).toThrow(MoneyError);
  });

  it("比較大小", () => {
    expect(compareMoney(money("100", "TWD"), money("150", "TWD"))).toBe(-1);
    expect(compareMoney(money("100.00", "TWD"), money(100, "TWD"))).toBe(0);
  });

  it("寫進資料庫的值是兩位小數文字", () => {
    expect(toDbAmount(money(150, "TWD"))).toBe("150.00");
    expect(toDbAmount(money("150.5", "EUR"))).toBe("150.50");
  });
});

describe("擋下錯誤的金額", () => {
  it.each([
    ["幣別不同不能相加", () => addMoney(money("1", "TWD"), money("1", "EUR"))],
    ["不支援的幣別", () => money("1", "USD")],
    ["台幣不能有小數", () => money("150.5", "TWD")],
    ["超過兩位小數", () => money("1.005", "EUR")],
    ["數字超過兩位小數", () => money(0.1 + 0.2, "EUR")],
    ["超出 numeric(12,2) 範圍", () => money("10000000000", "TWD")],
    ["加總後超出範圍", () => addMoney(money("9999999999", "TWD"), money("1", "TWD"))],
    ["格式錯誤", () => money("1e3", "TWD")],
    ["不是數字", () => money(Number.NaN, "TWD")],
  ])("%s", (_, fn) => {
    expect(fn).toThrow(MoneyError);
  });
});
