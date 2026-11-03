import type { ClaimedDelivery, EventStore } from "@/shared/events/store";
import type { EventPayload } from "@/shared/events/types";

type MemEvent = {
  id: string;
  type: string;
  source: string;
  payload: EventPayload;
  createdAt: string;
  fannedOut: boolean;
};
type MemDelivery = {
  id: string;
  eventId: string;
  handler: string;
  status: "pending" | "processing" | "done" | "failed";
  attempts: number;
  nextAttemptAt: Date;
  lastError: string | null;
};

/** 單元測試用：行為和 Supabase 版本相同的記憶體存放。 */
export class MemoryEventStore implements EventStore {
  events: MemEvent[] = [];
  deliveries: MemDelivery[] = [];
  private seq = 0;
  constructor(private readonly now: () => Date = () => new Date()) {}

  async insertEvent(type: string, source: string, payload: EventPayload) {
    const id = `evt-${++this.seq}`;
    this.events.push({
      id,
      type,
      source,
      payload,
      createdAt: this.now().toISOString(),
      fannedOut: false,
    });
    return id;
  }

  async fanOut(subscriptions: Record<string, string[]>, limit: number) {
    const batch = this.events.filter((e) => !e.fannedOut).slice(0, limit);
    for (const e of batch) {
      for (const handler of subscriptions[e.type] ?? []) {
        if (!this.deliveries.some((d) => d.eventId === e.id && d.handler === handler)) {
          this.deliveries.push({
            id: `dlv-${++this.seq}`,
            eventId: e.id,
            handler,
            status: "pending",
            attempts: 0,
            nextAttemptAt: this.now(),
            lastError: null,
          });
        }
      }
      e.fannedOut = true;
    }
    return batch.length;
  }

  async claim(limit: number): Promise<ClaimedDelivery[]> {
    const due = this.deliveries
      .filter((d) => d.status === "pending" && d.nextAttemptAt <= this.now())
      .slice(0, limit);
    return due.map((d) => {
      d.status = "processing";
      d.attempts++;
      const e = this.events.find((x) => x.id === d.eventId)!;
      return {
        deliveryId: d.id,
        eventId: e.id,
        handler: d.handler,
        attempts: d.attempts,
        eventType: e.type,
        payload: e.payload,
        eventCreatedAt: e.createdAt,
      };
    });
  }

  private find(id: string, attempts: number) {
    const d = this.deliveries.find(
      (x) => x.id === id && x.attempts === attempts && x.status === "processing",
    );
    if (!d) throw new Error("delivery not owned");
    return d;
  }

  async markDone(id: string, attempts: number) {
    const d = this.find(id, attempts);
    d.status = "done";
    d.lastError = null;
  }

  async markRetry(id: string, attempts: number, next: Date, error: string) {
    const d = this.find(id, attempts);
    d.status = "pending";
    d.nextAttemptAt = next;
    d.lastError = error;
  }

  async markFailed(id: string, attempts: number, error: string) {
    const d = this.find(id, attempts);
    d.status = "failed";
    d.lastError = error;
  }
}
