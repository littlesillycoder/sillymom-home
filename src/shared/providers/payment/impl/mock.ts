import { randomUUID } from "node:crypto";
import { addMoney, compareMoney, money, subtractMoney } from "@/shared/i18n/money";
import { runOnce } from "../../idempotency";
import type { ProviderLogStore } from "../../log/types";
import type { ChargeResult, PaymentProvider, RefundResult } from "../types";

const MOCK_SIGNATURE = "mock-signature";

/**
 * 金流 mock：不真的扣款，寫進外部服務紀錄。
 * 綁卡：跳轉方式導回 returnUrl 並帶假代號；嵌入方式回傳假的 SDK 設定。
 */
export function createMockPayment(store: ProviderLogStore): PaymentProvider {
  const implementation = "mock";
  return {
    implementation,

    async startCardBinding({ customerRef, returnUrl, mode }) {
      await store.write({
        service: "payment",
        implementation,
        action: "startCardBinding",
        status: "success",
        request: { customerRef, mode },
      });
      if (mode === "embedded") {
        return { kind: "embedded", sdkConfig: { environment: "mock", customerRef } };
      }
      return {
        kind: "redirect",
        url: returnUrl,
        formFields: { mockCardToken: `mock_card_${randomUUID()}`, mockSignature: MOCK_SIGNATURE },
      };
    },

    verifyCallback(payload) {
      return payload.mockSignature === MOCK_SIGNATURE;
    },

    async completeCardBinding({ payload }) {
      if (payload.mockSignature !== MOCK_SIGNATURE || !payload.mockCardToken) {
        await store.write({
          service: "payment",
          implementation,
          action: "completeCardBinding",
          status: "failure",
          resultCode: "INVALID_SIGNATURE",
          errorMessage: "簽章不正確",
          request: {},
        });
        throw new Error("金流回傳的簽章不正確");
      }
      const card = { token: payload.mockCardToken, last4: "4242", brand: "VISA" };
      await store.write({
        service: "payment",
        implementation,
        action: "completeCardBinding",
        status: "success",
        externalId: card.token,
        resultCode: "OK",
        request: {},
        response: { last4: card.last4, brand: card.brand },
      });
      return card;
    },

    charge({ idempotencyKey, cardToken, amount, orderRef }) {
      return runOnce<ChargeResult>(
        store,
        "payment",
        "charge",
        idempotencyKey,
        async () => {
          const result: ChargeResult = {
            transactionId: `mock_txn_${randomUUID()}`,
            status: "succeeded",
            amount,
            resultCode: "OK",
          };
          return {
            result,
            entry: {
              service: "payment",
              implementation,
              action: "charge",
              status: "success",
              externalId: result.transactionId,
              amount,
              resultCode: result.resultCode,
              request: { orderRef, cardToken },
              response: { status: result.status },
            },
          };
        },
        (e) => ({
          transactionId: e.externalId!,
          status: e.status === "success" ? "succeeded" : "failed",
          amount: e.amount!,
          resultCode: e.resultCode ?? "",
          errorMessage: e.errorMessage,
        }),
      );
    },

    refund({ idempotencyKey, transactionId, amount }) {
      return runOnce<RefundResult>(
        store,
        "payment",
        "refund",
        idempotencyKey,
        async () => {
          const result: RefundResult = {
            refundId: `mock_refund_${randomUUID()}`,
            transactionId,
            status: "succeeded",
            amount,
            resultCode: "OK",
          };
          return {
            result,
            entry: {
              service: "payment",
              implementation,
              action: "refund",
              status: "success",
              externalId: transactionId,
              amount,
              resultCode: result.resultCode,
              request: { transactionId },
              response: { refundId: result.refundId, status: result.status },
            },
          };
        },
        (e) => ({
          refundId: String(e.response?.refundId ?? ""),
          transactionId: e.externalId!,
          status: e.status === "success" ? "succeeded" : "failed",
          amount: e.amount!,
          resultCode: e.resultCode ?? "",
          errorMessage: e.errorMessage,
        }),
      );
    },

    async getTransaction(transactionId) {
      const entries = await store.findByExternalId("payment", transactionId);
      const charge = entries.find((e) => e.action === "charge" && e.status === "success");
      if (!charge?.amount) return null;
      const refunded = entries
        .filter((e) => e.action === "refund" && e.status === "success" && e.amount)
        .reduce((sum, e) => addMoney(sum, e.amount!), money(0, charge.amount.currency));
      const left = compareMoney(
        subtractMoney(charge.amount, refunded),
        money(0, charge.amount.currency),
      );
      return {
        transactionId,
        status:
          compareMoney(refunded, money(0, charge.amount.currency)) === 0
            ? "succeeded"
            : left === 0
              ? "refunded"
              : "partiallyRefunded",
        amount: charge.amount,
        refundedAmount: refunded,
      };
    },
  };
}
