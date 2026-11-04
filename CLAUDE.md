# 傻媽萬事通（sillymom-home）

修繕師傅媒合平台：客戶先和師傅視訊診斷估價，再預約到府維修。品牌主打「女性客戶安心」，客戶可以選擇師傅性別。平台只收平台費，維修費由客戶直接付給師傅。

## 開始任何工作前必讀

- `docs/技術決定.md`：技術選擇、收費、資料保存、資安。
- `docs/架構說明.md`：模組化規則、資料夾結構、事件、外部服務替換介面。
- `design/README.md`：設計稿怎麼讀。
- `docs/頁面對照表.md`：頁面和設計稿檔名的對照。
- `docs/電腦版自動調整寬度規則.md`：不同螢幕寬度怎麼排版。
- `docs/設計補充/設計補充.md`（設計稿以外新定案的設計）。

## 工作方式

- **一次只做一個 GitHub issue**，範圍以 issue 的「要做」為限，不要順手做「這次不做」的部分。
- 開始前先讀 issue 列出的設計稿檔案和截圖；做完後對照截圖檢查畫面。
- 每個 issue 開一個分支、一個 PR，PR 說明寫上 `Refs #issue號碼`。**不要寫 `Closes`、`Fixes`**，以免 PR 合併時自動關閉 issue。
- issue 裡的「完成標準」全部達成才算完成。做不完的部分，在 issue 留言說明，並開新的 issue，不要留下做一半的程式。
- 跟使用者溝通用繁體中文。

### 每個 issue 的流程（一定要照順序）

1. **先討論方向**：讀完 issue 和相關文件後，先跟使用者說明打算怎麼做、有哪些要決定的地方，等使用者回覆。**每個建議都要以資安為考量**：說明這個做法的資安風險和怎麼防範；有不同選項時，優先推薦比較安全的，並說明取捨。
2. **寫下執行方式**：討論確定後，在 issue 留一則 comment，標題「執行方式」，寫上討論後確定的做法。
3. **等使用者確認才開始改程式**：使用者確認「執行方式」之前，不能建立分支、不能改任何程式碼。
4. **寫驗證步驟**：程式完成後，在 issue 另外留一則**新的** comment，標題「驗證步驟」，寫清楚使用者要怎麼一步一步檢查（網址、帳號、要點哪裡、應該看到什麼）。
5. **貼回驗證結果**：使用者照「驗證步驟」檢查時，每通過一步（或發現問題），Claude Code 都要在 issue 留一則「驗證結果」comment，逐步列出結果（通過／不通過、實際看到什麼、驗證時發現的修正）。不要只留在對話裡。
6. **等使用者驗證**：使用者驗證完成後，會在 issue 加上 `Verified` label。**沒有 `Verified` label 的 issue 不能關閉**，Claude Code 也不能自己加這個 label。

## 一定要遵守

1. **模組化**：程式放在 `src/modules/<模組>/`；跨模組只能 import `modules/<模組>/index.ts`，或用事件。不能直接讀寫別的模組的資料表。
   - `shared/` 不能 import 任何模組；`app/` 只能 import 模組的 `index.ts` 和 `shared/`。`pnpm lint` 會自動檢查（`eslint-plugin-boundaries`）。
   - `shared/supabase/admin.ts`（略過 RLS 的連線）只有模組的 `server/`、`shared/events/`、`shared/health/` 可以 import。畫面元件和頁面不能用。
   - 新模組照 `tests/fixtures/modules/` 的範例寫，`README.md` 寫清楚負責什麼、公開介面、資料表、發出和接收的事件。
2. **事件**（`src/shared/events/`，說明見 `docs/架構說明.md` 第 4 節）：
   - 名稱 `<模組>.<過去式>`；內容只放編號、數字、狀態，**不放個資**（程式和資料庫都會擋）。
   - **跟錢、權限、後台操作紀錄、申訴有關的事件，一定要用資料庫函式 `public.emit_event()`**，和業務資料寫在同一個交易。其他事件可以用 `emitEvent()`（寫完資料後發出）。
   - 接收者要寫成「執行兩次結果一樣」，在 `src/event-handlers.ts` 註冊。
3. **外部服務**：金流、發票、簡訊、通知只能透過 `src/shared/providers/` 的介面呼叫，不能直接呼叫綠界、EVERY8D、LINE 的程式。
4. **不寫死**：
   - 每個用到翻譯的 layout、page 開頭先 `await initRequestLocale()`（`@/shared/i18n/request-locale`），頁面才能預先產生。
   - 畫面文字放在語言檔 `src/shared/i18n/messages/`（繁中、英文，兩邊項目要一樣）。`.tsx` 裡直接寫中文，lint 會擋下。站內連結用 `@/shared/i18n` 的 `Link`（自動帶語言）。
   - **金額**：資料庫存 `numeric(12,2)`（例如 `150.50`）＋另一欄幣別代碼（`TWD`、`EUR`）。程式裡用 `Money` 型別，加減、比較只能用 `@/shared/i18n` 的 `addMoney`、`subtractMoney`、`compareMoney` 等工具，**不能直接對金額做 `+`、`-`**；顯示用 `formatMoney`。台幣不能有小數。
   - **時間**：存 UTC（`timestamptz`），顯示用 `formatDate`、`formatTime`、`formatDateTime`，時區照 `src/shared/config/regions.ts`，24 小時制。沒有時區的時間文字會被擋下。
   - 收費金額和保存天數從平台設定讀，不寫在程式裡。
5. **資安**：
   - 每張新資料表都要有 Row Level Security，並寫測試證明別人讀不到。
   - 金鑰只放環境變數，`.env*` 不進 git。
   - 錄影、證件用短效連結；不在 log 裡印出個資（手機、地址、證件號碼）。
   - 禁止 `dangerouslySetInnerHTML`（lint 會擋）；需要粗體、連結的文字用 next-intl 的 `t.rich()`。
   - 開發用頁面（`/health`、`/[語言]/dev/...`）只在 development、preview 開啟（`isDevToolsEnabled()`）。
6. **設計**：顏色、字級、間距、圓角照設計稿；共用樣式做成 `src/shared/ui` 的元件，不逐頁複製 CSS。
   - 樣式寫法：**CSS 變數 + CSS Modules**（不用 Tailwind）。設計規範在 `src/shared/ui/tokens.css`，元件和頁面一律用 `var(--...)`，不直接寫色碼；全站規則在 `src/shared/ui/base.css`。
   - 先用 `@/shared/ui` 現有的元件（按鈕、標籤、卡片、輸入框、勾選框、開關、分頁籤、對話框、步驟列、提示框、圖示、文字連結），展示在 `/[語言]/dev/ui`。不裝元件庫、圖示套件。
   - 圖示只用設計稿有的（`Icon`），新圖示先跟設計確認。
   - 字型 Noto Sans TC 用 `next/font`（使用者瀏覽時不連到 Google）。
   - 頁面外框用 `@/shared/layout`：一般頁面 `PageShell`（頁首 guest／member／tech，頁尾 full／compact／none，照 `docs/設計補充/設計補充.md` 第 2 節），後台 `AdminShell`。內容用 `Container` 縮排。
   - 網址一律用 `@/shared/navigation/routes` 的 `routeHref()`，新頁面先加進清單（`built: false` 會顯示「建置中」，做完改成 `true`）。網址不放個資；`[id]` 一律用 UUID。
   - 提示內容、說明文字這類段落用 `word-break: normal`（正常換行），標題、按鈕、標籤不斷詞。
   - 卡片圓角 16、卡片裡的小框 12。
   - 單獨一行的文字連結靠右；「← 回…」返回連結靠左上。
   - 中文詞不從中間斷開（`word-break: keep-all`），段落用 `word-break: normal`。
   - 網站上不使用 emoji。
7. **資料庫**：只用標準 PostgreSQL 功能；資料表變更一律寫 migration（`supabase/migrations/`）。
   - 已經推上雲端的 migration 不能修改，要改就寫新的 migration。
   - **可能含個資的資料表，不用 check constraint 做檢查**：失敗時錯誤明細會附上整筆資料（含個資），會進錯誤訊息和 log。改用觸發程序自己丟錯誤，只寫規則和欄位名稱，不寫值（範例：`events_validate`）。
   - 測試專用的資料表放 `tests/fixtures/sql/`，不放 migrations。

## 指令

套件管理用 pnpm（`corepack enable pnpm`）。Node 24 以上。

- 安裝：`pnpm install`
- 本機開發：`cp .env.example .env.local` 並填入值，然後 `pnpm dev`，打開 http://localhost:3000
- 測試：`pnpm test`（需要資料庫的測試在本機沒有 Docker 時會自動略過，GitHub Actions 會跑）
- 檢查（lint、格式、型別、測試）：`pnpm check`；自動排版：`pnpm format`
- 版面自動檢查（Playwright，11 種寬度）：`pnpm test:e2e`（會自己開開發伺服器；已經在跑 `pnpm dev` 的話用 `E2E_BASE_URL=http://localhost:3000 pnpm test:e2e`）
- 資料庫：新增 migration `pnpm db:new <名稱>`；推到雲端開發專案 `pnpm db:push`（第一次要先 `pnpm exec supabase login` 和 `pnpm exec supabase link`）
- 工程檢查：開發和 PR 預覽環境打開 `/health`，會回傳資料庫讀寫狀態（JSON）
- 部署：（#83 補上）
