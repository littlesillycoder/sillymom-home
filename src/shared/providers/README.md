# shared/providers：外部服務替換介面（#4）

金流、發票、簡訊、通知。換服務（例如賣到歐洲改用 Stripe）時只換實作，不改其他程式。

## 怎麼用
```ts
import { getPaymentProvider } from "@/shared/providers/payment";
const pay = getPaymentProvider(); // 依 PAYMENT_PROVIDER 選實作
await pay.charge({ idempotencyKey: `charge-${caseId}`, cardToken, amount, orderRef: caseId });
```
- 只能 import `@/shared/providers/<服務>`，**不能 import `impl/` 裡的實作**（lint 會擋）。
- 只能在伺服器端使用（`server-only`）。

## 選擇實作
| 環境變數 | 允許的值（台灣，`src/shared/config/regions.ts`） |
|---|---|
| `PAYMENT_PROVIDER` | `mock`、`ecpay` |
| `INVOICE_PROVIDER` | `mock`、`ecpay` |
| `SMS_PROVIDER` | `mock`、`every8d` |
| `NOTIFY_PROVIDER` | `mock`、`line` |

- 開發、PR 預覽、展示沒設定時用 `mock`。
- **正式環境一定要設定，而且不能是 `mock`**（直接報錯，不會假裝成功）。
- 設成地區清單以外的值 → 報錯。

## 接新服務（例如 `ecpay`）要做的事
1. 在 `<服務>/impl/<名稱>.ts` 實作 `<服務>/types.ts` 的介面。
2. 在 `<服務>/index.ts` 依名稱回傳實作；在 `regions.ts` 的允許清單加上名稱。
3. 遵守下面的規則，並寫測試（可以參考 `src/shared/providers/mocks.test.ts`）。

## 規則（每個實作都要遵守）
- **卡號不經過我們的伺服器**：綁卡用金流服務的跳轉付款頁或嵌入輸入框；我們只存卡片代號。兩種方式介面都支援。
- **驗證回傳通知的簽章**（`verifyCallback`），不通過就丟棄。
- **不重複執行**：扣款、退款、開發票、折讓都要帶 `idempotencyKey`；同一個編號再呼叫，回傳第一次的結果（`idempotency.ts` 的 `runOnce`；資料庫也有唯一限制）。
- **驗證碼**：由 Supabase Auth 產生和比對（Send SMS Hook，#11）；簡訊介面只負責送出。開發、展示的固定驗證碼用 Supabase 的測試手機號碼，不在這裡。
- **範本**：通知、一般簡訊只能用 `templates.ts` 的範本代號＋參數；範本有繁中、英文（語言檔 `providerTemplates`），依收件人的語言送出。參數不能有個資欄位（會報錯）。
- **外部服務紀錄**（`provider_logs`）：
  - 個資遮掉再記（`log/mask.ts`）：手機只留前 2、後 3 碼；驗證碼 `******`；發票載具只留後 3 碼。
  - 通知、簡訊只存範本代號和案件編號，不存內文。
  - 交易編號、金額、結果、狀態碼、錯誤訊息完整保留。
  - 保存天數在平台設定 `provider_logs_retention_days`（預設 90），`POST /internal/maintenance` 刪除過期紀錄（排程在 #83 設定）。
  - 只有伺服器端能讀寫；「老闆」角色可看的規則在 #47 加上。
