# member 模組

## 負責什麼
會員：地址、緊急聯絡人、我信任的師傅、帳號設定

## 公開介面（`index.ts`）
目前沒有。

## 資料表
資料表只能由本模組的 `server/` 讀寫，別的模組要資料請透過公開介面或事件。權限測試在 `tests/db/schema.rls.test.ts`。

- `customers`：稱呼、語言。新帳號由資料庫自動建立（`handle_new_user`），客戶只能改自己的稱呼和語言。手機號碼只在 Supabase Auth。
  - migration：`supabase/migrations/20261105120200_member_customers.sql`

## 發出的事件（`events.ts`）
目前沒有。

## 接收的事件
目前沒有。接收者要寫成「執行兩次結果一樣」。

## 資料夾
- `index.ts`：公開介面
- `components/`：畫面元件
- `server/`：商業規則、資料存取（只能讀寫本模組的資料表）
- `events.ts`：本模組發出的事件型別
- `tests/`：測試
