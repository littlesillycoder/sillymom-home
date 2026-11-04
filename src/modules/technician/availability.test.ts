import { describe, expect, it } from "vitest";
import { availabilityParts, formatShortDate } from "./availability";

const tw = { locale: "zh-TW" as const, timeZone: "Asia/Taipei" };

describe("可視訊時間", () => {
  // 現在：台灣 2026-11-04（三）15:00 = UTC 07:00
  const now = new Date("2026-11-04T07:00:00Z");

  it("今天：台灣 20:00", () => {
    expect(availabilityParts("2026-11-04T12:00:00Z", now, tw)).toEqual({
      day: "today",
      time: "20:00",
    });
  });

  it("明天：台灣 11/5 10:00", () => {
    expect(availabilityParts("2026-11-05T02:00:00Z", now, tw)).toEqual({
      day: "tomorrow",
      time: "10:00",
    });
  });

  it("更晚：台灣 11/6（五）10:00", () => {
    expect(availabilityParts("2026-11-06T02:00:00Z", now, tw)).toEqual({
      day: "later",
      date: "11/6（五）",
      time: "10:00",
    });
  });

  it("跨午夜：UTC 還是 11/4，但台灣已經是 11/5 → 明天", () => {
    // UTC 11/4 17:00 = 台灣 11/5 01:00
    expect(availabilityParts("2026-11-04T17:00:00Z", now, tw)).toEqual({
      day: "tomorrow",
      time: "01:00",
    });
  });

  it("跨午夜：台灣晚上 23:30 看凌晨 00:30 → 明天", () => {
    const late = new Date("2026-11-04T15:30:00Z"); // 台灣 23:30
    expect(availabilityParts("2026-11-04T16:30:00Z", late, tw)).toEqual({
      day: "tomorrow",
      time: "00:30",
    });
  });

  it("跨月：10/31 看 11/1 → 明天；看 11/2 → 更晚", () => {
    const oct31 = new Date("2026-10-31T04:00:00Z"); // 台灣 10/31 12:00
    expect(availabilityParts("2026-11-01T02:00:00Z", oct31, tw).day).toBe("tomorrow");
    expect(availabilityParts("2026-11-02T02:00:00Z", oct31, tw)).toMatchObject({
      day: "later",
      date: "11/2（一）",
    });
  });

  it("跨年：12/31 看 1/1 → 明天", () => {
    const dec31 = new Date("2026-12-31T04:00:00Z");
    expect(availabilityParts("2027-01-01T02:00:00Z", dec31, tw).day).toBe("tomorrow");
  });

  it("時間已經過了，當作今天", () => {
    expect(availabilityParts("2026-11-04T01:00:00Z", now, tw).day).toBe("today");
  });

  it("英文短日期", () => {
    expect(formatShortDate("2026-11-06T02:00:00Z", { locale: "en", timeZone: "Asia/Taipei" })).toBe(
      "Fri 11/6",
    );
  });
});
