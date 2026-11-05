import type { ProviderService } from "@/shared/config/regions";
import type { ProviderLogEntry, ProviderLogStore } from "@/shared/providers/log/types";

/** 單元測試用：行為和 Supabase 版本相同（同一服務、動作、編號只會有一筆）。 */
export class MemoryProviderLogStore implements ProviderLogStore {
  entries: ProviderLogEntry[] = [];

  async write(entry: ProviderLogEntry) {
    if (
      entry.idempotencyKey &&
      this.entries.some(
        (e) =>
          e.service === entry.service &&
          e.action === entry.action &&
          e.idempotencyKey === entry.idempotencyKey,
      )
    ) {
      throw new Error("duplicate idempotency key");
    }
    this.entries.push(structuredClone(entry));
  }

  async findByIdempotencyKey(service: ProviderService, action: string, key: string) {
    return (
      this.entries.find(
        (e) => e.service === service && e.action === action && e.idempotencyKey === key,
      ) ?? null
    );
  }

  async findByExternalId(service: ProviderService, externalId: string) {
    return this.entries.filter((e) => e.service === service && e.externalId === externalId);
  }
}
