# 範例模組（只在測試裡）

示範模組怎麼寫、事件怎麼從一個模組送到另一個模組。**不進正式程式**，資料表只建在測試資料庫（`tests/fixtures/sql/`）。

- `example-sender`：發出 `example-sender.pinged`
  - 一般方式：寫完資料再發事件（`sendPing`）
  - 同交易方式：資料庫函式裡呼叫 `public.emit_event()`（`sendPingAtomic`）
- `example-receiver`：收到後寫一筆紀錄到自己的資料表（`onPinged`），重複收到也只有一筆

真的模組放在 `src/modules/<模組>/`，資料存取在 `server/`，用 `createAdminClient()`；範例為了連到測試資料庫，改成由參數傳入連線。
