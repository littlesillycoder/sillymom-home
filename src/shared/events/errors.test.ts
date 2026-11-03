import { describe, expect, it } from "vitest";
import { sanitizeError } from "./errors";

describe("sanitizeError", () => {
  it("遮掉 Email 和長串數字（例如手機）", () => {
    const msg = sanitizeError(new Error("send to amy@example.com / 0912-345-678 failed"));
    expect(msg).not.toContain("amy@example.com");
    expect(msg).not.toContain("0912");
    expect(msg).toContain("[email]");
    expect(msg).toContain("[number]");
  });

  it("截短到 500 字以內", () => {
    expect(sanitizeError(new Error("x".repeat(2000))).length).toBeLessThanOrEqual(500);
  });

  it("不是 Error 也能處理", () => {
    expect(sanitizeError("boom")).toBe("Unknown error: boom");
  });
});
