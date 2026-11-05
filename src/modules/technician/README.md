# technician 模組

## 負責什麼
師傅：申請、審核、個人頁、排班

## 公開介面（`index.ts`）
- 師傅卡（#9）：`SimpleTechCard`（首頁、服務分類）、`SimpleTechCardWithBooking`（登入後首頁「我信任的師傅」）、`DetailedTechCard`（師傅列表、推薦）、`FavoriteTechCard`（我信任的師傅與封鎖）、`TechSummaryRow`（預約摘要）。展示在 `/[語言]/dev/ui`。
- 型別 `TechCardData`、`TechStatus`（在線中／視訊中／稍後可視訊）。
- `availabilityParts`：「可視訊：今天 20:00 後／明天 10:00／11/6（四）10:00」。

卡片只顯示稱呼、頭像字和公開資訊，不顯示全名、手機號碼；連結用 UUID。

## 資料表
資料表只能由本模組的 `server/` 讀寫，別的模組要資料請透過公開介面或事件。權限測試在 `tests/db/schema.rls.test.ts`。

- `technicians`：師傅資料。師傅只能改稱呼、專長類別、技能、服務地區、語言；評分、審核狀態、徽章只有伺服器端能改。
- `public_technicians`（檢視表）：公開資料，只有已通過審核的師傅和可以公開的欄位。未登入也能讀。新增欄位前要確認可以公開。
  - migration：`supabase/migrations/20261105120300_technician_technicians.sql`

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
