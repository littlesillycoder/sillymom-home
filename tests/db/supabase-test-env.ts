/**
 * 需要資料庫的測試用的連線設定。
 * 在 GitHub Actions 上由 `supabase start` 開的暫時資料庫提供；
 * 本機沒有 Docker 時，這些變數不存在，測試會自動略過。
 * 刻意不用 NEXT_PUBLIC_SUPABASE_URL，避免測試碰到雲端專案的資料。
 */
export const testDb = {
  url: process.env.SUPABASE_TEST_URL,
  publishableKey: process.env.SUPABASE_TEST_PUBLISHABLE_KEY,
  secretKey: process.env.SUPABASE_TEST_SECRET_KEY,
  dbUrl: process.env.SUPABASE_TEST_DB_URL,
};

export const hasTestDb = Boolean(testDb.url && testDb.publishableKey && testDb.secretKey);

export const skipReason =
  "略過需要資料庫的測試：沒有 SUPABASE_TEST_* 環境變數（本機沒有 Docker 時正常，GitHub Actions 會跑）";

if (process.env.REQUIRE_TEST_DB && !hasTestDb) {
  throw new Error("REQUIRE_TEST_DB 已設定，但沒有 SUPABASE_TEST_* 環境變數");
}
