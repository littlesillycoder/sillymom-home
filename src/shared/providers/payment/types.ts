import type { Money } from "@/shared/i18n/money";

/**
 * 金流介面。卡號一律直接送到金流服務（綠界），不經過我們的伺服器；我們只存卡片代號。
 * 綁卡支援兩種方式（#42 問完綠界再決定用哪一種）：跳轉付款頁、站內付嵌入輸入框。
 */
export type CardBindingStart =
  | {
      kind: "redirect";
      /** 導向金流服務的付款頁 */
      url: string;
      /** 要用 POST 送過去的表單欄位 */
      formFields: Record<string, string>;
    }
  | {
      kind: "embedded";
      /** 前端 SDK 需要的設定（卡號由金流服務的輸入框直接送給金流服務） */
      sdkConfig: Record<string, string>;
    };

export type CardToken = {
  /** 金流服務給的卡片代號（不是卡號） */
  token: string;
  /** 卡號末四碼、卡別：顯示用 */
  last4: string;
  brand: string;
};

export type ChargeResult = {
  transactionId: string;
  status: "succeeded" | "failed";
  amount: Money;
  /** 金流服務回傳的狀態碼 */
  resultCode: string;
  errorMessage?: string;
};

export type RefundResult = {
  refundId: string;
  transactionId: string;
  status: "succeeded" | "failed";
  amount: Money;
  resultCode: string;
  errorMessage?: string;
};

export type Transaction = {
  transactionId: string;
  status: "succeeded" | "failed" | "refunded" | "partiallyRefunded";
  amount: Money;
  refundedAmount: Money;
};

export interface PaymentProvider {
  readonly implementation: string;
  /** 開始綁卡。customerRef：我們的會員編號（UUID）；returnUrl：綁卡完成後回到我們網站的網址。 */
  startCardBinding(input: {
    customerRef: string;
    returnUrl: string;
    mode: "redirect" | "embedded";
  }): Promise<CardBindingStart>;
  /** 驗證金流服務回傳的結果（簽章不對就丟錯），換成卡片代號。 */
  completeCardBinding(input: { payload: Record<string, string> }): Promise<CardToken>;
  /** 驗證金流服務的回傳通知簽章。 */
  verifyCallback(payload: Record<string, string>): boolean;
  /** 扣款。idempotencyKey：不重複編號，重試時用同一個。 */
  charge(input: {
    idempotencyKey: string;
    cardToken: string;
    amount: Money;
    /** 我們的訂單編號 */
    orderRef: string;
  }): Promise<ChargeResult>;
  refund(input: {
    idempotencyKey: string;
    transactionId: string;
    amount: Money;
  }): Promise<RefundResult>;
  getTransaction(transactionId: string): Promise<Transaction | null>;
}
