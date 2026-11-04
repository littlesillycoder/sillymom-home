import { expect, type Page } from "@playwright/test";

/** 自動檢查的寬度（#8 執行方式）：常見裝置、切換點兩邊、寬度規則第 7 節、超寬螢幕。 */
export const WIDTHS = [390, 767, 768, 800, 1024, 1099, 1100, 1280, 1440, 1920, 2560];

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "頁面不能左右捲動").toBeLessThanOrEqual(0);
}

/** 開發模式左下角的 Issue 數量（Next.js 開發工具）。 */
export async function devIssueCount(page: Page): Promise<number> {
  await page.waitForTimeout(1500);
  return page.evaluate(() => {
    const text = document.querySelector("nextjs-portal")?.shadowRoot?.textContent ?? "";
    const m = text.match(/(\d+)\s*Issues?/);
    return m ? Number(m[1]) : 0;
  });
}
