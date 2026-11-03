import { describe, expect, it } from "vitest";
import { MemoryEventStore } from "../../../tests/support/memory-event-store";
import { EventPayloadError, insertEvent, validateEvent } from "./emit";

describe("validateEvent", () => {
  it("事件名稱要是 <模組>.<過去式>", () => {
    expect(() => validateEvent("VideoEnded", {})).toThrow(EventPayloadError);
    expect(() => validateEvent("video.ended", {})).not.toThrow();
  });

  it("內容必須是物件", () => {
    expect(() => validateEvent("video.ended", [])).toThrow(EventPayloadError);
    expect(() => validateEvent("video.ended", null)).toThrow(EventPayloadError);
  });

  it("有個資欄位就擋下，錯誤訊息只列欄位名稱、不列值", () => {
    try {
      validateEvent("booking.created", { bookingId: "b1", customerPhone: "0912345678" });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(EventPayloadError);
      expect((e as Error).message).toContain("customerPhone");
      expect((e as Error).message).not.toContain("0912345678");
    }
  });
});

describe("insertEvent", () => {
  it("用事件名稱的前半段當發出模組", async () => {
    const store = new MemoryEventStore();
    // @ts-expect-error 測試用事件不在 EventMap
    await insertEvent(store, "video.ended", { videoSessionId: "v1" });
    expect(store.events[0]).toMatchObject({ type: "video.ended", source: "video" });
  });

  it("有個資時不會寫入", async () => {
    const store = new MemoryEventStore();
    // @ts-expect-error 測試用事件不在 EventMap
    await expect(insertEvent(store, "video.ended", { email: "a@b.c" })).rejects.toThrow();
    expect(store.events).toHaveLength(0);
  });
});
