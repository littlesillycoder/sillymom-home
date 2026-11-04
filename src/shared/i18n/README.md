# shared/i18n：多語系、金額、日期時間

從 `@/shared/i18n` import。

| 檔案 | 內容 |
|---|---|
| `messages/zh-TW.json`、`messages/en.json` | 畫面文字（兩邊項目要一樣，有測試檢查） |
| `routing.ts`、`navigation.ts` | 語言路由；站內連結用這裡的 `Link` |
| `request.ts` | next-intl 每個請求的設定（語言、時區、文字） |
| `money.ts` | `Money` 型別、計算、`formatMoney` |
| `datetime.ts` | `formatDate`、`formatTime`、`formatDateTime`（UTC 轉地區時區，24 小時制） |
| `LanguageSwitcher.tsx` | 語言切換：`variant="desktop"`（頁首右邊）、`"mobile"`（手機選單最上面） |
| `accept-language.ts` | 第一次進網站依瀏覽器語言選繁中或英文 |

## 規則
- 網址一律帶語言：`/zh-TW/...`、`/en/...`。第一次進網站照瀏覽器語言（中文用繁中、其他用英文、沒送用繁中），切換過的語言用 cookie 記住（`src/proxy.ts`，`docs/設計補充/設計補充.md` 第 1 節）。
- 金額：資料庫 `numeric(12,2)` ＋幣別代碼；程式裡只能用工具計算，不能直接 `+`、`-`。
- 時間：資料庫 `timestamptz`（UTC）；只接受帶時區的時間文字。
- 時區和幣別來自 `src/shared/config/regions.ts`。

`shared/` 不能 import 任何模組。
