import { describe, expect, it, vi } from "vitest";
import { MemoryEventStore } from "../../../tests/support/memory-event-store";
import { MAX_ATTEMPTS, RETRY_DELAYS_SECONDS, processEvents } from "./processor";
import type { HandlerRegistration } from "./types";

function clock(start = "2026-11-03T00:00:00Z") {
  let t = new Date(start).getTime();
  return { now: () => new Date(t), advance: (s: number) => (t += s * 1000) };
}

function handler(
  type: string,
  name: string,
  handle: HandlerRegistration["handle"],
): HandlerRegistration {
  return { type, name, handle };
}

describe("processEvents", () => {
  it("把事件交給每個接收者，各自一筆處理紀錄", async () => {
    const store = new MemoryEventStore();
    const a = vi.fn(async () => {});
    const b = vi.fn(async () => {});
    await store.insertEvent("video.ended", "video", { videoSessionId: "v1" });

    const summary = await processEvents({
      store,
      handlers: [
        handler("video.ended", "billing.onVideoEnded", a),
        handler("video.ended", "review.onVideoEnded", b),
      ],
    });

    expect(summary).toMatchObject({ fannedOut: 1, claimed: 2, done: 2 });
    expect(a).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "video.ended",
        attempt: 1,
        payload: { videoSessionId: "v1" },
      }),
    );
    expect(b).toHaveBeenCalledOnce();
    expect(store.deliveries.map((d) => d.status)).toEqual(["done", "done"]);
  });

  it("一個接收者失敗不影響另一個", async () => {
    const store = new MemoryEventStore();
    await store.insertEvent("video.ended", "video", {});
    const summary = await processEvents({
      store,
      handlers: [
        handler("video.ended", "billing.onVideoEnded", async () => {
          throw new Error("boom");
        }),
        handler("video.ended", "review.onVideoEnded", async () => {}),
      ],
    });
    expect(summary).toMatchObject({ done: 1, retried: 1 });
  });

  it("失敗時照間隔重試，用完次數標記 failed，錯誤訊息有遮罩", async () => {
    const c = clock();
    const store = new MemoryEventStore(c.now);
    let calls = 0;
    const failing = handler("video.ended", "billing.onVideoEnded", async () => {
      calls++;
      throw new Error("call 0912345678 failed");
    });
    await store.insertEvent("video.ended", "video", {});

    await processEvents({ store, handlers: [failing], now: c.now });
    for (const delay of RETRY_DELAYS_SECONDS) {
      // 還沒到時間不會重試
      await processEvents({ store, handlers: [failing], now: c.now });
      c.advance(delay);
      await processEvents({ store, handlers: [failing], now: c.now });
    }

    expect(calls).toBe(MAX_ATTEMPTS);
    const d = store.deliveries[0];
    expect(d.status).toBe("failed");
    expect(d.attempts).toBe(MAX_ATTEMPTS);
    expect(d.lastError).not.toContain("0912345678");
  });

  it("重試成功後是 done", async () => {
    const c = clock();
    const store = new MemoryEventStore(c.now);
    let calls = 0;
    const flaky = handler("video.ended", "billing.onVideoEnded", async () => {
      if (++calls === 1) throw new Error("temporary");
    });
    await store.insertEvent("video.ended", "video", {});
    await processEvents({ store, handlers: [flaky], now: c.now });
    expect(store.deliveries[0]).toMatchObject({
      status: "pending",
      attempts: 1,
      lastError: "Error: temporary",
    });
    c.advance(RETRY_DELAYS_SECONDS[0]);
    await processEvents({ store, handlers: [flaky], now: c.now });
    expect(store.deliveries[0]).toMatchObject({ status: "done", attempts: 2, lastError: null });
  });

  it("處理完的事件不會再處理一次", async () => {
    const store = new MemoryEventStore();
    const h = vi.fn(async () => {});
    await store.insertEvent("video.ended", "video", {});
    await processEvents({ store, handlers: [handler("video.ended", "billing.onVideoEnded", h)] });
    await processEvents({ store, handlers: [handler("video.ended", "billing.onVideoEnded", h)] });
    expect(h).toHaveBeenCalledOnce();
    expect(store.deliveries).toHaveLength(1);
  });

  it("接收者被移除時，處理紀錄會重試而不是當成成功", async () => {
    const store = new MemoryEventStore();
    await store.insertEvent("video.ended", "video", {});
    await store.fanOut({ "video.ended": ["billing.onVideoEnded"] }, 10);
    const summary = await processEvents({ store, handlers: [] });
    expect(summary).toMatchObject({ done: 0, retried: 1 });
  });
});
