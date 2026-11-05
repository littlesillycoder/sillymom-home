# log 工具（#6）

所有 log 都經過這裡，自動遮蔽個資。其他程式不能直接用 `console`（lint 會擋）。

```ts
import { log } from "@/shared/log";

log.info("booking.accepted", { bookingId });
log.warn("turnstile.failed", { reason });
log.error("events.process_failed", error, { deliveryId });
```

## 規則

- **事件名稱**：固定的英文代號（小寫、數字、`.`、`_`、`-`），不能放變數或使用者輸入。格式不對會記成 `invalid_event_name`。
- **欄位遮蔽**（`mask.ts`）：
  1. 欄位名稱是個資（和事件的規則相同，`src/shared/events/pii.ts`）→ 整個值換成 `[redacted]`。包括手機、地址、email、姓名、證件號碼、LINE 使用者 ID、驗證碼（otp）、卡號、token、密碼。
  2. 文字內容像手機、email、身分證或居留證號、卡號（Luhn 檢查）、LINE 使用者 ID → 換成 `[phone]`、`[email]` 等。
- **地址、姓名沒辦法靠格式判斷**：只能放在有名稱的欄位（`{ address }`），不能夾在一段文字裡。
- **錯誤**：只記類型和遮蔽後的訊息，不記整個物件。
- 太長的文字截斷到 500 字；物件最多 5 層、每層 50 項。

## 之後

- 錯誤監控（#93）送出前也要用 `maskValue()` 遮蔽，規則一樣。
