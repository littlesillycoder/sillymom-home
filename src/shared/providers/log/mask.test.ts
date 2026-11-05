import { describe, expect, it } from "vitest";
import { maskCarrier, maskCode, maskPhone } from "./mask";

describe("個資遮罩", () => {
  it("手機只留前 2 碼和後 3 碼", () => {
    expect(maskPhone("0912345678")).toBe("09*****678");
    expect(maskPhone("0912-345-678")).toBe("09*****678");
    expect(maskPhone("+886912345678")).toBe("+8********678");
    expect(maskPhone("0912345678")).not.toContain("12345");
  });

  it("驗證碼全部遮掉", () => {
    expect(maskCode()).toBe("******");
  });

  it("發票載具只留後 3 碼", () => {
    expect(maskCarrier("/ABC1234")).toBe("*****234");
    expect(maskCarrier("AB")).toBe("**");
  });
});
