import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProviderService } from "@/shared/config/regions";
import { money } from "@/shared/i18n/money";
import { createAdminClient } from "@/shared/supabase/admin";
import type { ProviderLogEntry, ProviderLogStore } from "./types";

type Row = {
  service: ProviderService;
  implementation: string;
  action: string;
  idempotency_key: string | null;
  status: "success" | "failure";
  external_id: string | null;
  amount: string | number | null;
  currency: string | null;
  result_code: string | null;
  error_message: string | null;
  request: Record<string, unknown>;
  response: Record<string, unknown> | null;
};

function toEntry(row: Row): ProviderLogEntry {
  return {
    service: row.service,
    implementation: row.implementation,
    action: row.action,
    idempotencyKey: row.idempotency_key ?? undefined,
    status: row.status,
    externalId: row.external_id ?? undefined,
    amount: row.amount !== null && row.currency ? money(row.amount, row.currency) : undefined,
    resultCode: row.result_code ?? undefined,
    errorMessage: row.error_message ?? undefined,
    request: row.request,
    response: row.response ?? undefined,
  };
}

const COLUMNS =
  "service, implementation, action, idempotency_key, status, external_id, amount, currency, result_code, error_message, request, response";

/** 外部服務紀錄存在 provider_logs（只有伺服器端能讀寫）。 */
export class SupabaseProviderLogStore implements ProviderLogStore {
  constructor(private readonly db: SupabaseClient = createAdminClient()) {}

  async write(entry: ProviderLogEntry) {
    const { error } = await this.db.from("provider_logs").insert({
      service: entry.service,
      implementation: entry.implementation,
      action: entry.action,
      idempotency_key: entry.idempotencyKey ?? null,
      status: entry.status,
      external_id: entry.externalId ?? null,
      amount: entry.amount?.amount ?? null,
      currency: entry.amount?.currency ?? null,
      result_code: entry.resultCode ?? null,
      error_message: entry.errorMessage ?? null,
      request: entry.request,
      response: entry.response ?? null,
    });
    if (error) throw new Error(`寫入外部服務紀錄失敗：${error.message}`);
  }

  async findByIdempotencyKey(service: ProviderService, action: string, key: string) {
    const { data, error } = await this.db
      .from("provider_logs")
      .select(COLUMNS)
      .eq("service", service)
      .eq("action", action)
      .eq("idempotency_key", key)
      .maybeSingle();
    if (error) throw new Error(`查詢外部服務紀錄失敗：${error.message}`);
    return data ? toEntry(data as Row) : null;
  }

  async findByExternalId(service: ProviderService, externalId: string) {
    const { data, error } = await this.db
      .from("provider_logs")
      .select(COLUMNS)
      .eq("service", service)
      .eq("external_id", externalId)
      .order("created_at");
    if (error) throw new Error(`查詢外部服務紀錄失敗：${error.message}`);
    return ((data ?? []) as Row[]).map(toEntry);
  }
}
