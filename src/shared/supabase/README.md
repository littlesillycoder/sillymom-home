# Supabase 連線

| 檔案 | 用在哪裡 | 權限 |
|---|---|---|
| `browser.ts` | Client Component | 目前使用者，受 Row Level Security 限制 |
| `server.ts` | Server Component、Route Handler | 目前使用者，受 Row Level Security 限制 |
| `admin.ts` | 只限伺服器的系統工作 | secret key，**略過** Row Level Security，謹慎使用 |

業務模組不要直接讀寫別的模組的資料表（見 `docs/架構說明.md`）。
