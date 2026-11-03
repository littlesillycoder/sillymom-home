import { describe, expect, it } from "vitest";
import { findForbiddenKeys, isForbiddenKey } from "./pii";

describe("個資欄位檢查", () => {
  it.each([
    "phone",
    "customerPhone",
    "phone_number",
    "mobile",
    "address",
    "homeAddress",
    "home_address",
    "email",
    "contactEmail",
    "name",
    "fullName",
    "full_name",
    "idNumber",
    "id_number",
    "nationalId",
    "password",
    "accessToken",
    "card_number",
    "lat",
    "lng",
  ])("擋下 %s", (key) => {
    expect(isForbiddenKey(key)).toBe(true);
  });

  it.each([
    "bookingId",
    "technician_id",
    "durationSeconds",
    "status",
    "amount",
    "currency",
    "hotelId",
  ])("允許 %s", (key) => {
    expect(isForbiddenKey(key)).toBe(false);
  });

  it("會往下檢查巢狀物件和陣列", () => {
    expect(
      findForbiddenKeys({
        bookingId: "b1",
        customer: { id: "c1", phone: "0912" },
        items: [{ ok: 1 }, { homeAddress: "x" }],
      }),
    ).toEqual(["customer.phone", "items[1].homeAddress"]);
  });
});
