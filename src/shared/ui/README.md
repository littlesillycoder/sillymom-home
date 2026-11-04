# shared/ui：設計規範與共用元件

從 `@/shared/ui` import。所有元件展示在 `/[語言]/dev/ui`（只在開發、預覽環境）。

| 檔案 | 內容 |
|---|---|
| `tokens.css` | 設計規範：顏色、字級、間距、圓角、尺寸（CSS 變數） |
| `base.css` | 全站規則：字型、背景、換行、不能左右滑、標題 |
| `fonts.ts` | Noto Sans TC（next/font，使用者瀏覽時不連到 Google） |
| `Button` | 主要、主要（藍）、次要、預約、框線、低調、危險、危險次要 × 大 48／中 44／小 36 |
| `Tag` | 性別、驗證徽章、資訊、中性、提醒、危險、醒目 |
| `Card`、`CardInner` | 卡片（圓角 16）、卡片裡的小框（圓角 12） |
| `TextField`、`TextArea` | 輸入框 44（驗證碼 48、搜尋 40）、錯誤訊息 |
| `Checkbox`、`Switch`、`Tabs` | 勾選框、開關、分頁籤（鍵盤可操作） |
| `Dialog` | 對話框（原生 `<dialog>`；手機從下方滑出、電腦置中） |
| `Stepper` | 步驟列 |
| `Alert` | 提示框（藍、黃、綠、紅） |
| `Icon` | 設計稿用到的圖示（線條風格） |
| `BackLink`、`EndLink` | 「← 回…」靠左上；單獨一行的連結靠右 |

## 規則
- 元件只接受文字（React 節點），不接受 HTML 字串。
- 文字從語言檔來；有意義的圖示要給 `label`。
- `shared/` 不能 import 任何模組。
