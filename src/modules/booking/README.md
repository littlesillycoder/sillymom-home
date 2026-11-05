# booking 模組

## 負責什麼
求助與預約：描述問題、預約、改期或取消

## 公開介面（`index.ts`）
- `SERVICE_CATEGORIES`、`ServiceCategory`：服務類別代號。

## 資料表
資料表只能由本模組的 `server/` 讀寫，別的模組要資料請透過公開介面或事件。權限測試在 `tests/db/schema.rls.test.ts`。

- `service_categories`：服務類別代號（和 `categories.ts` 一致），名稱放語言檔 `serviceCategories`。
- `help_requests`：求助（類別、描述、行政區、狀態）。不存完整地址；狀態只有伺服器端能改。
- `request_attachments`：附件紀錄，存放位置限定在 `requests/<求助編號>/`。
- `video_bookings`：視訊預約。建立和狀態變更只有伺服器端能做。
  - migration：`supabase/migrations/20261105120100_booking_service_categories.sql`、`20261105120400_booking_requests_and_video_bookings.sql`

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
