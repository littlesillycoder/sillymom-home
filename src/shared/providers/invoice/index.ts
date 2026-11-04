import "server-only";
import { resolveImplementation } from "../config";
import { SupabaseProviderLogStore } from "../log/supabase-store";
import { createMockInvoice } from "./impl/mock";
import type { InvoiceProvider } from "./types";

export type * from "./types";

/**
 * 依環境變數取得實作（#4）。其他程式只能 import 這個檔案，不能 import impl/ 裡的實作。
 * 真的實作在 Milestone 3 加上。
 */
export function getInvoiceProvider(): InvoiceProvider {
  const implementation = resolveImplementation("invoice");
  if (implementation === "mock") return createMockInvoice(new SupabaseProviderLogStore());
  throw new Error(`外部服務實作尚未完成：invoice=${implementation}`);
}
