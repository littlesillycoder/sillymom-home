import { describe, expect, it } from "vitest";
import { maskString, maskValue, REDACTED, serializeError } from "./mask";

describe("log 遮蔽：依文字格式", () => {
  it.each([
    ["手機 0912345678", "0912345678", "[phone]"],
    ["手機 0912-345-678", "0912-345-678", "[phone]"],
    ["手機 0912 345 678", "0912 345 678", "[phone]"],
    ["國際格式 +886912345678", "+886912345678", "[phone]"],
    ["國際格式 +886 912 345 678", "+886 912 345 678", "[phone]"],
    ["email amy.lin+test@example.com.tw", "amy.lin+test@example.com.tw", "[email]"],
    ["身分證 A123456789", "A123456789", "[id-no]"],
    ["新式居留證 A800000014", "A800000014", "[id-no]"],
    ["舊式居留證 AB12345678", "AB12345678", "[id-no]"],
    ["卡號 4111111111111111", "4111111111111111", "[card]"],
    ["卡號 4111 1111 1111 1111", "4111 1111 1111 1111", "[card]"],
    ["卡號 4111-1111-1111-1111", "4111-1111-1111-1111", "[card]"],
    ["LINE U4af4980629abcdef0123456789abcdef", "U4af4980629abcdef0123456789abcdef", "[line-id]"],
  ])("%s", (text, secret, label) => {
    const out = maskString(text);
    expect(out).not.toContain(secret);
    expect(out).toContain(label);
  });

  it("一段文字裡有多個個資都會遮掉", () => {
    const out = maskString("聯絡 0912345678 或 amy@example.com，身分證 A123456789");
    expect(out).toBe("聯絡 [phone] 或 [email]，身分證 [id-no]");
  });

  it.each([
    ["時間戳記", "created 1730781234567"],
    ["13 位數但不是卡號（Luhn 不通過）", "order 1234567890123"],
    ["UUID", "booking 3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b"],
    ["金額", "amount 1500.00 TWD"],
    ["一般文字", "events.process_failed after 3 attempts"],
    ["HTTP 狀態碼", "status 404"],
  ])("一般內容不會被誤遮：%s", (_, text) => {
    expect(maskString(text)).toBe(text);
  });

  it("太長的文字會截斷", () => {
    const out = maskString("x".repeat(2000));
    expect(out.length).toBeLessThanOrEqual(501);
  });
});

describe("log 遮蔽：依欄位名稱", () => {
  it.each([
    "phone",
    "customerPhone",
    "address",
    "homeAddress",
    "email",
    "name",
    "fullName",
    "customer_name",
    "idNumber",
    "nationalId",
    "lineUserId",
    "line_id",
    "otp",
    "smsOtp",
    "cardNumber",
    "accessToken",
    "password",
    "authorization",
    "Authorization",
    "cookie",
    "Set-Cookie",
    "set_cookie",
    "apiKey",
    "api_key",
    "x-api-key",
  ])("%s 整個值遮掉", (key) => {
    const out = maskValue({ [key]: "台北市信義區松仁路 100 號 王小美" }) as Record<string, unknown>;
    expect(out[key]).toBe(REDACTED);
  });

  it("HTTP 標頭裡的登入資訊和 cookie 會遮掉，其他標頭保留", () => {
    expect(
      maskValue({
        headers: {
          Authorization: "Bearer secret-value",
          Cookie: "sb-access-token=abc",
          "content-type": "application/json",
        },
      }),
    ).toEqual({
      headers: { Authorization: REDACTED, Cookie: REDACTED, "content-type": "application/json" },
    });
  });

  it.each(["apiVersion", "authorized", "authorId"])(
    "名稱裡只是剛好有這些字的一般欄位不會被誤遮：%s",
    (key) => {
      expect((maskValue({ [key]: "x" }) as Record<string, unknown>)[key]).toBe("x");
    },
  );

  it("巢狀物件和陣列也會遮", () => {
    expect(
      maskValue({
        bookingId: "b1",
        customer: { id: "c1", address: "台北市", note: "請打 0912345678" },
        items: [{ ok: 1 }, { email: "a@b.co" }],
      }),
    ).toEqual({
      bookingId: "b1",
      customer: { id: "c1", address: REDACTED, note: "請打 [phone]" },
      items: [{ ok: 1 }, { email: REDACTED }],
    });
  });

  it("一般欄位保留（編號、數字、狀態、時間）", () => {
    const at = new Date("2026-11-05T00:00:00Z");
    expect(maskValue({ bookingId: "b1", amount: 1500, ok: true, status: "paid", at })).toEqual({
      bookingId: "b1",
      amount: 1500,
      ok: true,
      status: "paid",
      at: "2026-11-05T00:00:00.000Z",
    });
  });

  it("不改動原本的物件", () => {
    const input = { phone: "0912345678" };
    maskValue(input);
    expect(input.phone).toBe("0912345678");
  });

  it("太深的物件不會一直往下（避免循環或超大資料）", () => {
    type Node = { child?: Node };
    const root: Node = {};
    let cur = root;
    for (let i = 0; i < 20; i++) {
      cur.child = {};
      cur = cur.child;
    }
    expect(JSON.stringify(maskValue(root))).toContain("[too-deep]");
  });
});

describe("錯誤", () => {
  it("只留類型和遮蔽後的訊息，不留其他屬性", () => {
    const error = Object.assign(new TypeError("找不到 amy@example.com 的帳號"), {
      details: { phone: "0912345678" },
    });
    expect(serializeError(error)).toEqual({ name: "TypeError", message: "找不到 [email] 的帳號" });
  });

  it("不是 Error 的東西不記內容", () => {
    expect(serializeError({ phone: "0912345678" })).toEqual({ name: "NonError" });
    expect(serializeError("0912345678")).toEqual({ name: "NonError" });
  });
});
