# technician 模組

## 負責什麼
師傅：申請、審核、個人頁、排班

## 公開介面（`index.ts`）
- 師傅卡（#9）：`SimpleTechCard`（首頁、服務分類）、`SimpleTechCardWithBooking`（登入後首頁「我信任的師傅」）、`DetailedTechCard`（師傅列表、推薦）、`FavoriteTechCard`（我信任的師傅與封鎖）、`TechSummaryRow`（預約摘要）。展示在 `/[語言]/dev/ui`。
- 型別 `TechCardData`、`TechStatus`（在線中／視訊中／稍後可視訊）。
- `availabilityParts`：「可視訊：今天 20:00 後／明天 10:00／11/6（四）10:00」。

卡片只顯示稱呼、頭像字和公開資訊，不顯示全名、手機號碼；連結用 UUID。

## 資料表
目前沒有。資料表只能由本模組的 `server/` 讀寫，別的模組要資料請透過公開介面或事件。

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
