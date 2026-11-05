import type { ProviderService } from "@/shared/config/regions";
import type { Money } from "@/shared/i18n/money";

/**
 * 一筆外部服務紀錄。request／response 寫入前一定要先遮罩個資（mask.ts）；
 * 通知類只存範本代號和案件編號。交易編號、金額、結果、狀態碼、錯誤訊息完整保留。
 */
export type ProviderLogEntry = {
  service: ProviderService;
  implementation: string;
  action: string;
  /** 不重複執行用的編號（扣款、退款、開發票、折讓） */
  idempotencyKey?: string;
  status: "success" | "failure";
  /** 外部服務的交易編號、發票號碼等 */
  externalId?: string;
  amount?: Money;
  /** 外部服務回傳的狀態碼和錯誤訊息（完整保留） */
  resultCode?: string;
  errorMessage?: string;
  request: Record<string, unknown>;
  response?: Record<string, unknown>;
};

export interface ProviderLogStore {
  write(entry: ProviderLogEntry): Promise<void>;
  /** 用不重複編號找之前的結果（同一個服務、同一個動作）。 */
  findByIdempotencyKey(
    service: ProviderService,
    action: string,
    key: string,
  ): Promise<ProviderLogEntry | null>;
  /** 用外部交易編號找紀錄（查詢交易）。 */
  findByExternalId(service: ProviderService, externalId: string): Promise<ProviderLogEntry[]>;
}
