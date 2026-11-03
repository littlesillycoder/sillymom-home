# 傻媽萬事通（sillymom-home）

修繕師傅媒合平台：客戶先和師傅視訊診斷估價，再預約到府維修。品牌主打「女性客戶安心」，客戶可以選擇師傅性別。平台只收平台費，維修費由客戶直接付給師傅。

## 開始任何工作前必讀

- `docs/技術決定.md`：技術選擇、收費、資料保存、資安。
- `docs/架構說明.md`：模組化規則、資料夾結構、事件、外部服務替換介面。
- `design/README.md`：設計稿怎麼讀。
- `docs/頁面對照表.md`：頁面和設計稿檔名的對照。
- `docs/電腦版自動調整寬度規則.md`：不同螢幕寬度怎麼排版。

## 工作方式

- **一次只做一個 GitHub issue**，範圍以 issue 的「要做」為限，不要順手做「這次不做」的部分。
- 開始前先讀 issue 列出的設計稿檔案和截圖；做完後對照截圖檢查畫面。
- 每個 issue 開一個分支、一個 PR，PR 說明寫上 `Refs #issue號碼`。**不要寫 `Closes`、`Fixes`**，以免 PR 合併時自動關閉 issue。
- issue 裡的「完成標準」全部達成才算完成。做不完的部分，在 issue 留言說明，並開新的 issue，不要留下做一半的程式。
- 跟使用者溝通用繁體中文。

### 每個 issue 的流程（一定要照順序）

1. **先討論方向**：讀完 issue 和相關文件後，先跟使用者說明打算怎麼做、有哪些要決定的地方，等使用者回覆。
2. **寫下執行方式**：討論確定後，在 issue 留一則 comment，標題「執行方式」，寫上討論後確定的做法。
3. **等使用者確認才開始改程式**：使用者確認「執行方式」之前，不能建立分支、不能改任何程式碼。
4. **寫驗證步驟**：程式完成後，在 issue 另外留一則**新的** comment，標題「驗證步驟」，寫清楚使用者要怎麼一步一步檢查（網址、帳號、要點哪裡、應該看到什麼）。
5. **等使用者驗證**：使用者驗證完成後，會在 issue 加上 `Verified` label。**沒有 `Verified` label 的 issue 不能關閉**，Claude Code 也不能自己加這個 label。

## 一定要遵守

1. **模組化**：程式放在 `src/modules/<模組>/`；跨模組只能 import `modules/<模組>/index.ts`，或用事件。不能直接讀寫別的模組的資料表。
2. **外部服務**：金流、發票、簡訊、通知只能透過 `src/shared/providers/` 的介面呼叫，不能直接呼叫綠界、EVERY8D、LINE 的程式。
3. **不寫死**：
   - 畫面文字放在語言檔（繁中、英文）。
   - 金額用共用的格式化工具，資料存「數字＋幣別代碼」。
   - 時間存 UTC，顯示時轉成地區時區。
   - 收費金額和保存天數從平台設定讀，不寫在程式裡。
4. **資安**：
   - 每張新資料表都要有 Row Level Security，並寫測試證明別人讀不到。
   - 金鑰只放環境變數，`.env*` 不進 git。
   - 錄影、證件用短效連結；不在 log 裡印出個資（手機、地址、證件號碼）。
5. **設計**：顏色、字級、間距、圓角照設計稿；共用樣式做成 `src/shared/ui` 的元件，不逐頁複製 CSS。
   - 卡片圓角 16、卡片裡的小框 12。
   - 單獨一行的文字連結靠右；「← 回…」返回連結靠左上。
   - 中文詞不從中間斷開（`word-break: keep-all`），段落用 `word-break: normal`。
   - 網站上不使用 emoji。
6. **資料庫**：只用標準 PostgreSQL 功能；資料表變更一律寫 migration（`supabase/migrations/`）。

## 指令

套件管理用 pnpm（`corepack enable pnpm`）。Node 24 以上。

- 安裝：`pnpm install`
- 本機開發：`cp .env.example .env.local` 並填入值，然後 `pnpm dev`，打開 http://localhost:3000
- 測試：`pnpm test`（需要資料庫的測試在本機沒有 Docker 時會自動略過，GitHub Actions 會跑）
- 檢查（lint、格式、型別、測試）：`pnpm check`；自動排版：`pnpm format`
- 資料庫：新增 migration `pnpm db:new <名稱>`；推到雲端開發專案 `pnpm db:push`（第一次要先 `pnpm exec supabase login` 和 `pnpm exec supabase link`）
- 工程檢查：開發和 PR 預覽環境打開 `/health`，會回傳資料庫讀寫狀態（JSON）
- 部署：（#83 補上）
