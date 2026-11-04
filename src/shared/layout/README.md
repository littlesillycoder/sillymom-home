# shared/layout：頁首、頁尾、手機選單、版面

從 `@/shared/layout` import。展示在 `/[語言]/dev/layout`（只在開發、預覽環境）。

| 元件 | 內容 |
|---|---|
| `PageShell` | 一般頁面外框：`header`（guest／member／tech）＋內容＋`footer`（full／compact／none） |
| `AdminShell` | 後台：1100 以上 240 寬文字選單；1099 以下 72 寬圖示選單 |
| `SiteHeader` | 頁首；767 以下手機頁首，768–1099 導覽收進選單按鈕，1100 以上完整導覽 |
| `SiteFooter` | 頁尾三種模式（`docs/設計補充/設計補充.md` 第 2 節） |
| `Container` | 內容左右留白（手機 16px、電腦 5.556%）、2560 以上最寬 2240 |
| `ComingSoon` | 「建置中」 |

## 規則
- 網址一律用 `@/shared/navigation/routes` 的 `routeHref()`，不手寫路徑。
- 頁首只顯示稱呼和頭像第一個字，不顯示手機號碼等個資。
- 背景滿版，內容用 `Container` 縮排。
