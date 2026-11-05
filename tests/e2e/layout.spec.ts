import { expect, test } from "@playwright/test";
import { devIssueCount, expectNoHorizontalScroll, WIDTHS } from "./helpers";

type Case = {
  name: string;
  path: string;
  footer?: "full" | "compact" | "none";
  admin?: boolean;
  /** 開發用展示頁：沒有頁首頁尾，只檢查橫向捲動和開發模式 Issue */
  bare?: boolean;
  /** 簡單頁首（#11 登入、求助流程）：手機有選單按鈕、768 以上只有返回連結；沒有頁尾 */
  simple?: boolean;
};

const CASES: Case[] = [
  { name: "未登入＋完整頁尾", path: "/zh-TW/dev/layout?header=guest&footer=full", footer: "full" },
  {
    name: "會員＋簡短頁尾",
    path: "/zh-TW/dev/layout?header=member&footer=compact",
    footer: "compact",
  },
  {
    name: "師傅＋簡短頁尾",
    path: "/zh-TW/dev/layout?header=tech&footer=compact",
    footer: "compact",
  },
  { name: "未登入＋不放頁尾", path: "/zh-TW/dev/layout?header=guest&footer=none", footer: "none" },
  { name: "首頁", path: "/zh-TW", footer: "full" },
  { name: "建置中（公開）", path: "/zh-TW/services", footer: "full" },
  // 會員、後台的建置中頁面要登入才看得到（#11），未登入的轉址測試在 auth.spec.ts
  { name: "建置中（求助流程）", path: "/zh-TW/request", footer: "none" },
  { name: "後台版面", path: "/zh-TW/dev/layout/admin", admin: true },
  { name: "登入或註冊", path: "/zh-TW/login", simple: true },
  { name: "手機快速驗證（求助步驟 2）", path: "/zh-TW/request/verify", simple: true },
  { name: "元件展示（含師傅卡）", path: "/zh-TW/dev/ui", bare: true },
];

for (const c of CASES) {
  test.describe(c.name, () => {
    for (const width of WIDTHS) {
      test(`${width} 寬`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(c.path);
        await expectNoHorizontalScroll(page);
        if (c.bare) return;

        if (c.admin) {
          const sidebar = page.getByTestId("admin-sidebar");
          const box = await sidebar.boundingBox();
          expect(box?.width, "後台選單寬度").toBe(width >= 1100 ? 240 : 72);
          return;
        }

        const header = page.locator("header").first();
        await expect(header).toBeVisible();

        if (c.simple) {
          const trigger = page.getByTestId("menu-trigger");
          if (width >= 768) await expect(trigger, "768 以上沒有選單按鈕").toBeHidden();
          else await expect(trigger, "手機有選單按鈕").toBeVisible();
          await expect(page.locator("footer")).toHaveCount(0);
          return;
        }

        const nav = header.getByRole("navigation");
        const trigger = page.getByTestId("menu-trigger");
        if (width >= 1100) {
          await expect(nav, "1100 以上顯示導覽").toBeVisible();
          await expect(trigger, "1100 以上沒有選單按鈕").toBeHidden();
        } else {
          await expect(nav, "1099 以下導覽收起來").toBeHidden();
          await expect(trigger, "1099 以下有選單按鈕").toBeVisible();
        }

        const footer = page.locator("footer");
        if (c.footer === "none") {
          await expect(footer).toHaveCount(0);
        } else if (c.footer === "compact") {
          if (width >= 768) await expect(footer).toBeVisible();
          else await expect(footer, "手機不放簡短頁尾").toBeHidden();
        } else {
          await expect(footer).toBeVisible();
        }
      });
    }
  });
}

test.describe("開發模式沒有 Issue", () => {
  for (const c of CASES) {
    test(c.name, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(c.path);
      expect(await devIssueCount(page)).toBe(0);
    });
  }
});

test.describe("手機選單", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("打開、Esc 關閉、點連結換頁並關閉、上一頁回得去", async ({ page }) => {
    await page.goto("/zh-TW/dev/layout?header=guest&footer=full");
    const dialog = page.getByTestId("menu-dialog");

    await page.getByTestId("menu-trigger").click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Switch to English" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await page.getByTestId("menu-trigger").click();
    await dialog.getByRole("link", { name: "服務項目" }).click();
    await expect(page).toHaveURL(/\/zh-TW\/services$/);
    // Next.js 會把剛離開的頁面藏起來保留（上一頁可以馬上顯示），所以只檢查「打開中」的選單
    await expect(page.locator('[data-testid="menu-dialog"][open]')).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "這一頁建置中" })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/zh-TW\/dev\/layout/);
  });

  test("會員選單只顯示稱呼，不顯示手機號碼", async ({ page }) => {
    await page.goto("/zh-TW/dev/layout?header=member&footer=compact");
    await page.getByTestId("menu-trigger").click();
    const dialog = page.getByTestId("menu-dialog");
    await expect(dialog.getByText("林小姐")).toBeVisible();
    await expect(dialog).not.toContainText(/09\d{8}|\+886\s?9/);
  });
});

test.describe("建置中與 404", () => {
  const UUID = "3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b";

  test("清單上還沒做的頁面顯示建置中", async ({ page }) => {
    await page.goto(`/zh-TW/technicians/${UUID}`);
    await expect(page.getByRole("heading", { name: "這一頁建置中" })).toBeVisible();
  });

  for (const path of [
    "/zh-TW/nope",
    "/zh-TW/technicians/1",
    "/zh-TW/technicians/not-a-uuid",
    "/zh-TW/services/%3Cscript%3Ealert(1)%3C%2Fscript%3E",
  ]) {
    test(`資安：不在清單上或參數不對 → 404（${path}）`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(404);
      await expect(page.getByRole("heading", { name: "找不到這個頁面" })).toBeVisible();
      await expect(page.locator("body")).not.toContainText("<script>");
    });
  }
});
