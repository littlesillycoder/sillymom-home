import type { HandlerRegistration } from "@/shared/events";

/**
 * 所有事件接收者的清單（組裝的地方，只有這裡同時認識各個模組）。
 * 新增接收者：在模組的 index.ts 公開 defineHandler(...) 的結果，然後加到這裡。
 */
export const eventHandlers: HandlerRegistration[] = [];
