// example-sender 發出的事件。內容只放編號。
declare module "@/shared/events" {
  interface EventMap {
    "example-sender.pinged": { pingId: string };
  }
}
export {};
