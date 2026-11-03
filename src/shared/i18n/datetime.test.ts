import { describe, expect, it } from "vitest";
import { DateTimeError, formatDate, formatDateTime, formatTime, toInstant } from "./datetime";

// 2026-11-03 07:30 UTC
const instant = "2026-11-03T07:30:00Z";

describe("時區轉換", () => {
  it("台灣（UTC+8）", () => {
    const tw = { locale: "zh-TW" as const, timeZone: "Asia/Taipei" };
    expect(formatTime(instant, tw)).toBe("15:30");
    expect(formatDate(instant, tw)).toBe("2026/11/3（週二）");
    expect(formatDateTime(instant, tw)).toBe("2026/11/3（週二） 15:30");
  });

  it("台灣跨日：UTC 晚上 20:00 是台灣隔天 04:00", () => {
    const tw = { locale: "zh-TW" as const, timeZone: "Asia/Taipei" };
    expect(formatDateTime("2026-11-03T20:00:00Z", tw)).toBe("2026/11/4（週三） 04:00");
  });

  it("歐洲冬令時間（UTC+1）", () => {
    const de = { locale: "en" as const, timeZone: "Europe/Berlin" };
    expect(formatTime(instant, de)).toBe("08:30");
    expect(formatDate(instant, de)).toBe("Tue, 11/3/2026");
  });

  it("歐洲夏令時間（UTC+2）", () => {
    const de = { locale: "en" as const, timeZone: "Europe/Berlin" };
    expect(formatTime("2026-07-01T07:30:00Z", de)).toBe("09:30");
  });

  it("24 小時制：午夜是 00:00", () => {
    expect(formatTime("2026-11-03T16:00:00Z", { locale: "en", timeZone: "Asia/Taipei" })).toBe(
      "00:00",
    );
  });
});

describe("只接受帶時區的時間", () => {
  it("沒有時區的文字會被擋下（避免被當成本地時間）", () => {
    expect(() => toInstant("2026-11-03 15:30")).toThrow(DateTimeError);
    expect(() => toInstant("2026-11-03T15:30:00")).toThrow(DateTimeError);
  });

  it("有時區的文字可以", () => {
    expect(toInstant("2026-11-03T15:30:00+08:00").toISOString()).toBe("2026-11-03T07:30:00.000Z");
  });

  it("無效的時間會被擋下", () => {
    expect(() => toInstant(new Date("nope"))).toThrow(DateTimeError);
    expect(() => toInstant("2026-13-45T00:00:00Z")).toThrow(DateTimeError);
  });
});
