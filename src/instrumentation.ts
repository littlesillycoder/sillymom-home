/** 伺服器啟動時執行一次：設定事件接收者。 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { configureEventHandlers } = await import("@/shared/events/server");
  const { eventHandlers } = await import("@/event-handlers");
  configureEventHandlers(eventHandlers);
}
