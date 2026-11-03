# shared/events：事件機制

模組之間的流程用事件串起來。詳細說明見 `docs/架構說明.md` 第 4 節。

| 檔案 | 內容 |
|---|---|
| `index.ts` | 型別、`defineHandler`（瀏覽器和伺服器都能 import） |
| `server.ts` | `emitEvent`、`runEventProcessing`、`configureEventHandlers`（只限伺服器） |
| `processor.ts` | 分派、認領、交給接收者、重試 |
| `supabase-store.ts` | 用 Supabase 存事件（secret key 連線） |
| `pii.ts` | 擋下個資欄位（資料庫也有同樣的檢查） |
| `errors.ts` | 錯誤訊息遮罩與截短 |

## 規則
1. 事件名稱 `<模組>.<過去式>`，例如 `video.ended`。
2. 事件內容只放編號、數字、狀態，**不放個資**。欄位名稱含 phone、address、email、name、token、card 等字會被擋下。
3. 跟錢、權限、後台操作紀錄、申訴有關的事件，用資料庫函式 `public.emit_event()`，和業務資料寫在同一個交易。
4. 接收者要寫成「執行兩次結果一樣」（重試時可能重複收到）。
5. 新的接收者加在 `src/event-handlers.ts`。
