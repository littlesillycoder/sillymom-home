import { randomInt, randomUUID } from "node:crypto";
import { runOnce } from "../../idempotency";
import { maskCarrier } from "../../log/mask";
import type { ProviderLogStore } from "../../log/types";
import type { InvoiceBuyer, InvoiceProvider, InvoiceResult } from "../types";

/** 載具遮罩後才記；統編是公司資料，保留。 */
function buyerForLog(buyer: InvoiceBuyer): Record<string, string> {
  if (buyer.kind === "mobileBarcode" || buyer.kind === "citizenCertificate") {
    return { kind: buyer.kind, carrier: maskCarrier(buyer.carrier) };
  }
  if (buyer.kind === "company") return { kind: buyer.kind, taxId: buyer.taxId };
  return { kind: buyer.kind };
}

/** 發票 mock：不真的開立，寫進外部服務紀錄。發票號碼 MK＋8 碼。 */
export function createMockInvoice(store: ProviderLogStore): InvoiceProvider {
  const implementation = "mock";
  return {
    implementation,

    issue({ idempotencyKey, orderRef, buyer, items, total }) {
      return runOnce<InvoiceResult>(
        store,
        "invoice",
        "issue",
        idempotencyKey,
        async () => {
          const result: InvoiceResult = {
            invoiceNumber: `MK${String(randomInt(0, 100_000_000)).padStart(8, "0")}`,
            status: "issued",
            total,
            resultCode: "OK",
          };
          return {
            result,
            entry: {
              service: "invoice",
              implementation,
              action: "issue",
              status: "success",
              externalId: result.invoiceNumber,
              amount: total,
              resultCode: result.resultCode,
              request: { orderRef, buyer: buyerForLog(buyer), itemCount: items.length },
            },
          };
        },
        (e) => ({
          invoiceNumber: e.externalId!,
          status: e.status === "success" ? "issued" : "failed",
          total: e.amount!,
          resultCode: e.resultCode ?? "",
          errorMessage: e.errorMessage,
        }),
      );
    },

    async void({ invoiceNumber, reason }) {
      await store.write({
        service: "invoice",
        implementation,
        action: "void",
        status: "success",
        externalId: invoiceNumber,
        resultCode: "OK",
        request: { reason },
      });
      return { resultCode: "OK" };
    },

    allowance({ idempotencyKey, invoiceNumber, amount }) {
      return runOnce(
        store,
        "invoice",
        "allowance",
        idempotencyKey,
        async () => {
          const result = { allowanceNumber: `mock_allowance_${randomUUID()}`, resultCode: "OK" };
          return {
            result,
            entry: {
              service: "invoice",
              implementation,
              action: "allowance",
              status: "success",
              externalId: invoiceNumber,
              amount,
              resultCode: result.resultCode,
              request: { invoiceNumber },
              response: { allowanceNumber: result.allowanceNumber },
            },
          };
        },
        (e) => ({
          allowanceNumber: String(e.response?.allowanceNumber ?? ""),
          resultCode: e.resultCode ?? "",
        }),
      );
    },
  };
}
