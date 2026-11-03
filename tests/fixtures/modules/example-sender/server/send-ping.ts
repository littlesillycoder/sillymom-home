import type { SupabaseClient } from "@supabase/supabase-js";
import { insertEvent } from "@/shared/events/emit";
import type { EventStore } from "@/shared/events/store";
import "../events";

/** 一般方式：先寫資料，再發事件（不在同一個交易）。 */
export async function sendPing(db: SupabaseClient, store: EventStore, note: string) {
  const { data, error } = await db.from("example_pings").insert({ note }).select("id").single();
  if (error) throw new Error(error.message);
  await insertEvent(store, "example-sender.pinged", { pingId: data.id });
  return data.id as string;
}

/** 同交易方式：資料和事件在資料庫函式裡一起寫入，一定同時成功或同時失敗。 */
export async function sendPingAtomic(db: SupabaseClient, note: string, failAfterEmit = false) {
  const { data, error } = await db.rpc("example_send_ping_atomic", {
    p_note: note,
    p_fail_after_emit: failAfterEmit,
  });
  if (error) throw new Error(error.message);
  return data as string;
}
