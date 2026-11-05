/**
 * 服務類別代號（#10）。和資料庫 service_categories 相同（tests/db/schema.rls.test.ts 會比對），
 * 名稱放語言檔 serviceCategories。順序照設計稿 Request。
 */
export const SERVICE_CATEGORIES = [
  "plumbing",
  "aircon",
  "appliance",
  "lighting",
  "lock",
  "network",
  "smart_home",
  "painting",
  "pest",
  "furniture",
  "handyman",
  "unsure",
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];
