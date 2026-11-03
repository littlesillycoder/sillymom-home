import { sanitizeError } from "./errors";
import type { EventStore } from "./store";
import type { EventEnvelope, HandlerRegistration } from "./types";

/** 重試間隔（秒）：1 分、5 分、30 分、2 小時、12 小時。第一次加上重試 5 次，共 6 次。 */
export const RETRY_DELAYS_SECONDS = [60, 300, 1800, 7200, 43200] as const;
export const MAX_ATTEMPTS = RETRY_DELAYS_SECONDS.length + 1;
const LOCK_SECONDS = 120;

export type ProcessSummary = {
  fannedOut: number;
  claimed: number;
  done: number;
  retried: number;
  failed: number;
};

export function subscriptionsOf(handlers: HandlerRegistration[]): Record<string, string[]> {
  const subscriptions: Record<string, string[]> = {};
  for (const h of handlers) {
    (subscriptions[h.type] ??= []).push(h.name);
  }
  return subscriptions;
}

/**
 * 處理一批事件：先分派（建立處理紀錄），再認領到期的紀錄並交給接收者。
 * 失敗時依 RETRY_DELAYS_SECONDS 重試，用完次數標記 failed。
 */
export async function processEvents(options: {
  store: EventStore;
  handlers: HandlerRegistration[];
  limit?: number;
  now?: () => Date;
}): Promise<ProcessSummary> {
  const { store, handlers, limit = 20, now = () => new Date() } = options;
  const byName = new Map(handlers.map((h) => [h.name, h]));
  const summary: ProcessSummary = { fannedOut: 0, claimed: 0, done: 0, retried: 0, failed: 0 };

  summary.fannedOut = await store.fanOut(subscriptionsOf(handlers), limit * 5);
  const deliveries = await store.claim(limit, LOCK_SECONDS, MAX_ATTEMPTS);
  summary.claimed = deliveries.length;

  for (const d of deliveries) {
    const registration = byName.get(d.handler);
    try {
      if (!registration || registration.type !== d.eventType) {
        throw new Error(`handler not registered: ${d.handler} for ${d.eventType}`);
      }
      const envelope = {
        id: d.eventId,
        type: d.eventType,
        payload: d.payload,
        createdAt: d.eventCreatedAt,
        attempt: d.attempts,
      } as unknown as EventEnvelope<never>;
      await registration.handle(envelope);
      await store.markDone(d.deliveryId, d.attempts);
      summary.done++;
    } catch (error) {
      const message = sanitizeError(error);
      if (d.attempts >= MAX_ATTEMPTS) {
        await store.markFailed(d.deliveryId, d.attempts, message);
        summary.failed++;
      } else {
        const delay = RETRY_DELAYS_SECONDS[d.attempts - 1] ?? RETRY_DELAYS_SECONDS.at(-1)!;
        await store.markRetry(
          d.deliveryId,
          d.attempts,
          new Date(now().getTime() + delay * 1000),
          message,
        );
        summary.retried++;
      }
    }
  }
  return summary;
}
