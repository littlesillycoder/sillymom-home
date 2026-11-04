import type { ProviderService } from "@/shared/config/regions";
import type { ProviderLogEntry, ProviderLogStore } from "./log/types";

export class IdempotencyError extends Error {
  name = "IdempotencyError";
}

const KEY_PATTERN = /^[A-Za-z0-9_-]{8,100}$/;

/**
 * 不重複執行（#4 執行方式第 4 點）：同一個編號再呼叫一次，回傳第一次的結果，不會重複扣款、退款、開發票。
 * 編號由呼叫的地方產生（例如「案件 UUID＋動作」），重試時用同一個。
 */
export async function runOnce<T>(
  store: ProviderLogStore,
  service: ProviderService,
  action: string,
  key: string,
  run: () => Promise<{ result: T; entry: Omit<ProviderLogEntry, "idempotencyKey"> }>,
  fromLog: (entry: ProviderLogEntry) => T,
): Promise<T> {
  if (!KEY_PATTERN.test(key)) {
    throw new IdempotencyError("不重複編號格式錯誤（8–100 個英數字、- 或 _）");
  }
  const previous = await store.findByIdempotencyKey(service, action, key);
  if (previous) return fromLog(previous);
  const { result, entry } = await run();
  await store.write({ ...entry, idempotencyKey: key });
  return result;
}
