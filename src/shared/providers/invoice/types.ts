import type { Money } from "@/shared/i18n/money";

/** 發票買受人：手機條碼、自然人憑證、公司統編，或不使用載具。 */
export type InvoiceBuyer =
  | { kind: "none" }
  | { kind: "mobileBarcode"; carrier: string }
  | { kind: "citizenCertificate"; carrier: string }
  | { kind: "company"; taxId: string };

export type InvoiceItem = { name: string; quantity: number; unitPrice: Money };

export type InvoiceResult = {
  invoiceNumber: string;
  status: "issued" | "failed";
  total: Money;
  resultCode: string;
  errorMessage?: string;
};

export interface InvoiceProvider {
  readonly implementation: string;
  /** 開立。idempotencyKey：不重複編號。 */
  issue(input: {
    idempotencyKey: string;
    orderRef: string;
    buyer: InvoiceBuyer;
    items: InvoiceItem[];
    total: Money;
  }): Promise<InvoiceResult>;
  /** 作廢 */
  void(input: { invoiceNumber: string; reason: string }): Promise<{ resultCode: string }>;
  /** 折讓。idempotencyKey：不重複編號。 */
  allowance(input: {
    idempotencyKey: string;
    invoiceNumber: string;
    amount: Money;
  }): Promise<{ allowanceNumber: string; resultCode: string }>;
}
