import type { SupabaseClient } from "@supabase/supabase-js";
import { defineHandler } from "@/shared/events";
import "../../example-sender/events";

/** 收到 example-sender.pinged 就寫一筆收據。用 event_id 當主鍵，重複收到也只有一筆。 */
export function makeOnPinged(db: SupabaseClient) {
  return defineHandler("example-sender.pinged", "example-receiver.onPinged", async (event) => {
    const { error } = await db
      .from("example_receipts")
      .upsert(
        { event_id: event.id, ping_id: event.payload.pingId },
        { onConflict: "event_id", ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);
  });
}
