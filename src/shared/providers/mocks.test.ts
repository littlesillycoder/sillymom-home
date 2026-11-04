import { describe, expect, it } from "vitest";
import { money } from "@/shared/i18n/money";
import { MemoryProviderLogStore } from "../../../tests/support/memory-provider-log-store";
import { IdempotencyError } from "./idempotency";
import { createMockInvoice } from "./invoice/impl/mock";
import { createMockNotify } from "./notify/impl/mock";
import { createMockPayment } from "./payment/impl/mock";
import { createMockSms } from "./sms/impl/mock";
import { TemplateError } from "./templates";

const CASE = "3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b";

describe("金流 mock", () => {
  it("扣款：同一個編號呼叫兩次只扣一次，回傳同一筆交易", async () => {
    const store = new MemoryProviderLogStore();
    const pay = createMockPayment(store);
    const input = {
      idempotencyKey: `charge-${CASE}`,
      cardToken: "mock_card_x",
      amount: money(150, "TWD"),
      orderRef: CASE,
    };
    const a = await pay.charge(input);
    const b = await pay.charge(input);
    expect(b.transactionId).toBe(a.transactionId);
    expect(store.entries.filter((e) => e.action === "charge")).toHaveLength(1);
  });

  it("退款：同一個編號只退一次；查詢交易看得到退款金額", async () => {
    const store = new MemoryProviderLogStore();
    const pay = createMockPayment(store);
    const charge = await pay.charge({
      idempotencyKey: `charge-${CASE}`,
      cardToken: "mock_card_x",
      amount: money(150, "TWD"),
      orderRef: CASE,
    });
    const refund = {
      idempotencyKey: `refund-${CASE}`,
      transactionId: charge.transactionId,
      amount: money(50, "TWD"),
    };
    await pay.refund(refund);
    await pay.refund(refund);
    expect(store.entries.filter((e) => e.action === "refund")).toHaveLength(1);
    const txn = await pay.getTransaction(charge.transactionId);
    expect(txn).toMatchObject({
      status: "partiallyRefunded",
      refundedAmount: { amount: "50.00", currency: "TWD" },
    });
  });

  it("交易編號、金額、結果、狀態碼完整保留", async () => {
    const store = new MemoryProviderLogStore();
    const charge = await createMockPayment(store).charge({
      idempotencyKey: `charge-${CASE}`,
      cardToken: "mock_card_x",
      amount: money("150.00", "TWD"),
      orderRef: CASE,
    });
    expect(store.entries[0]).toMatchObject({
      externalId: charge.transactionId,
      amount: { amount: "150.00", currency: "TWD" },
      status: "success",
      resultCode: "OK",
    });
  });

  it("不重複編號格式不對 → 報錯", async () => {
    const pay = createMockPayment(new MemoryProviderLogStore());
    await expect(
      pay.charge({ idempotencyKey: "x", cardToken: "t", amount: money(1, "TWD"), orderRef: CASE }),
    ).rejects.toThrow(IdempotencyError);
  });

  it("綁卡：跳轉、嵌入兩種都支援；簽章不對就拒絕", async () => {
    const store = new MemoryProviderLogStore();
    const pay = createMockPayment(store);
    const redirect = await pay.startCardBinding({
      customerRef: CASE,
      returnUrl: "https://example.test/back",
      mode: "redirect",
    });
    expect(redirect.kind).toBe("redirect");
    const embedded = await pay.startCardBinding({
      customerRef: CASE,
      returnUrl: "https://example.test/back",
      mode: "embedded",
    });
    expect(embedded.kind).toBe("embedded");
    if (redirect.kind !== "redirect") throw new Error();
    const card = await pay.completeCardBinding({ payload: redirect.formFields });
    expect(card.token).toMatch(/^mock_card_/);
    await expect(
      pay.completeCardBinding({ payload: { mockCardToken: "x", mockSignature: "forged" } }),
    ).rejects.toThrow();
    expect(pay.verifyCallback({ mockSignature: "forged" })).toBe(false);
  });
});

describe("發票 mock", () => {
  it("開立：同一個編號只開一張；載具遮罩、統編保留", async () => {
    const store = new MemoryProviderLogStore();
    const inv = createMockInvoice(store);
    const input = {
      idempotencyKey: `invoice-${CASE}`,
      orderRef: CASE,
      buyer: { kind: "mobileBarcode" as const, carrier: "/ABC1234" },
      items: [{ name: "平台費", quantity: 1, unitPrice: money(100, "TWD") }],
      total: money(100, "TWD"),
    };
    const a = await inv.issue(input);
    const b = await inv.issue(input);
    expect(b.invoiceNumber).toBe(a.invoiceNumber);
    expect(store.entries).toHaveLength(1);
    expect(JSON.stringify(store.entries[0])).not.toContain("ABC1234");
    expect(store.entries[0].request).toMatchObject({ buyer: { carrier: "*****234" } });

    await inv.issue({
      ...input,
      idempotencyKey: `invoice-b-${CASE}`,
      buyer: { kind: "company", taxId: "12345678" },
    });
    expect(store.entries[1].request).toMatchObject({ buyer: { taxId: "12345678" } });
  });

  it("折讓：同一個編號只折讓一次", async () => {
    const store = new MemoryProviderLogStore();
    const inv = createMockInvoice(store);
    const input = {
      idempotencyKey: `allowance-${CASE}`,
      invoiceNumber: "MK00000001",
      amount: money(50, "TWD"),
    };
    await inv.allowance(input);
    await inv.allowance(input);
    expect(store.entries.filter((e) => e.action === "allowance")).toHaveLength(1);
  });
});

describe("簡訊 mock", () => {
  it("驗證碼：紀錄裡沒有完整手機和驗證碼", async () => {
    const store = new MemoryProviderLogStore();
    await createMockSms(store).sendVerificationCode({
      phone: "0912345678",
      code: "482913",
      locale: "zh-TW",
    });
    const logged = JSON.stringify(store.entries);
    expect(logged).not.toContain("0912345678");
    expect(logged).not.toContain("482913");
    expect(store.entries[0].request).toMatchObject({ to: "09*****678", code: "******" });
  });

  it("一般簡訊：只記範本代號和案件編號，不記內文", async () => {
    const store = new MemoryProviderLogStore();
    await createMockSms(store).sendMessage({
      phone: "0912345678",
      locale: "zh-TW",
      template: "bookingAccepted",
      params: { caseId: CASE },
    });
    expect(store.entries[0].request).toEqual({
      to: "09*****678",
      template: "bookingAccepted",
      caseId: CASE,
      locale: "zh-TW",
    });
  });
});

describe("通知 mock", () => {
  it("只記範本代號和案件編號", async () => {
    const store = new MemoryProviderLogStore();
    await createMockNotify(store).notify({
      recipientId: "9c8b7a6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
      locale: "en",
      template: "videoStartingSoon",
      params: { caseId: CASE, time: "15:30" },
    });
    expect(store.entries[0].request).toEqual({ template: "videoStartingSoon", caseId: CASE });
  });

  it("參數有個資欄位 → 報錯，不會送出", async () => {
    const store = new MemoryProviderLogStore();
    await expect(
      createMockNotify(store).notify({
        recipientId: CASE,
        locale: "zh-TW",
        template: "bookingAccepted",
        params: { caseId: CASE, homeAddress: "台北市" } as never,
      }),
    ).rejects.toThrow(TemplateError);
    expect(store.entries).toHaveLength(0);
  });

  it("不存在的範本 → 報錯", async () => {
    await expect(
      createMockNotify(new MemoryProviderLogStore()).notify({
        recipientId: CASE,
        locale: "zh-TW",
        template: "freeText" as never,
        params: { caseId: CASE },
      }),
    ).rejects.toThrow(TemplateError);
  });
});
