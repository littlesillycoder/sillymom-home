import { afterEach, describe, expect, it } from "vitest";
import { configureEventHandlers, getConfiguredEventHandlers, validateHandlers } from "./registry";

const noop = async () => {};

afterEach(() => {
  delete (globalThis as Record<symbol, unknown>)[Symbol.for("sillymom.eventHandlers")];
});

describe("接收者清單", () => {
  it("名稱格式和重複會被擋下", () => {
    expect(() =>
      validateHandlers([{ type: "video.ended", name: "bad name", handle: noop }]),
    ).toThrow();
    expect(() =>
      validateHandlers([{ type: "VideoEnded", name: "billing.onVideoEnded", handle: noop }]),
    ).toThrow();
    expect(() =>
      validateHandlers([
        { type: "video.ended", name: "billing.onVideoEnded", handle: noop },
        { type: "video.ended", name: "billing.onVideoEnded", handle: noop },
      ]),
    ).toThrow();
  });

  it("還沒設定時是 null，設定後取得同一份", () => {
    expect(getConfiguredEventHandlers()).toBeNull();
    const list = [{ type: "video.ended", name: "billing.onVideoEnded", handle: noop }];
    configureEventHandlers(list);
    expect(getConfiguredEventHandlers()).toBe(list);
  });
});
