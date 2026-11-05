# Supabase 連線

| 檔案 | 用在哪裡 | 權限 |
|---|---|---|
| `browser.ts` | Client Component | 目前使用者，受 Row Level Security 限制 |
| `server.ts` | Server Component、Route Handler | 目前使用者，受 Row Level Security 限制 |
| `admin.ts` | 只限伺服器的系統工作 | secret key，**略過** Row Level Security，謹慎使用 |

業務模組不要直接讀寫別的模組的資料表（見 `docs/架構說明.md`）。

## 資料庫型別（#10）

`database.types.ts` 由 Supabase 依 migration 產生，**不要手動修改**。三種連線都已套用，欄位名稱或型別寫錯時，型別檢查會抓到。

改了 migration 之後：
- 有 Docker：`pnpm exec supabase start` 後執行 `pnpm db:types`。
- 沒有 Docker：推上去開 PR，GitHub 的資料庫測試會比對型別；不一致時失敗，到那次檢查的 Artifacts 下載 `database-types`，換掉 `database.types.ts`。
