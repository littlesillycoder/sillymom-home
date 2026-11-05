import { afterEach, describe, expect, it, vi } from "vitest";
import { buildEntry, log } from "./index";

afterEach(() => vi.restoreAllMocks());

describe("log 工具", () => {
  it("輸出一行 JSON，欄位已遮蔽", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    log.info("booking.accepted", { bookingId: "b1", phone: "0912345678" });
    const line = spy.mock.calls[0][0] as string;
    expect(line).not.toContain("0912345678");
    expect(JSON.parse(line)).toMatchObject({
      level: "info",
      event: "booking.accepted",
      data: { bookingId: "b1", phone: "[redacted]" },
    });
  });

  it("error 帶錯誤類型和遮蔽後的訊息", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    log.error("events.process_failed", new Error("send to 0912345678 failed"), {
      deliveryId: "d1",
    });
    const entry = JSON.parse(spy.mock.calls[0][0] as string);
    expect(entry.error).toEqual({ name: "Error", message: "send to [phone] failed" });
    expect(entry.data).toEqual({ deliveryId: "d1" });
  });

  it("warn 用 console.warn", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    log.warn("turnstile.failed");
    expect(spy).toHaveBeenCalledOnce();
  });

  it("資安：事件名稱不是固定代號（可能是使用者輸入）時不寫出原字", () => {
    expect(buildEntry("info", "user typed 0912345678").event).toBe("invalid_event_name");
    expect(buildEntry("info", "Booking.Accepted").event).toBe("invalid_event_name");
  });
});
