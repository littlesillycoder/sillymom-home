import { expect, test } from "@playwright/test";

/**
 * #11 登入：未登入不能進會員、師傅、後台的頁面（轉到登入頁，登入後回原頁）；登出是 POST。
 * 畫面測試沒有資料庫，只測未登入的情況；登入成功的流程在 tests/db/auth.phone.test.ts 和驗證步驟。
 */

test.describe("未登入不能進會員、師傅、後台的頁面", () => {
  for (const path of [
    "/dashboard",
    "/records",
    "/account",
    "/tech",
    "/tech/schedule",
    "/tech/apply",
    "/admin",
    "/admin/settings",
  ]) {
    test(`${path} → 登入頁，並記住要回去的頁面`, async ({ page }) => {
      await page.goto(`/zh-TW${path}`);
      await expect(page).toHaveURL(
        new RegExp(
          `/zh-TW/login\\?next=${encodeURIComponent(path).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        ),
      );
      await expect(page.getByRole("heading", { level: 1, name: "登入或註冊" })).toBeVisible();
      await expect(page.getByText("這一頁建置中")).toHaveCount(0);
    });
  }

  test("公開頁面、求助流程不用登入", async ({ page }) => {
    for (const path of ["/zh-TW/services", "/zh-TW/request", "/zh-TW/request/verify"]) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
    }
  });
});

test.describe("登入頁", () => {
  test("有手機、驗證碼、稱呼、同意條款；條款連結開新分頁", async ({ page }) => {
    await page.goto("/zh-TW/login");
    await expect(page.getByLabel("手機號碼")).toHaveAttribute("type", "tel");
    const code = page.getByRole("textbox", { name: "輸入簡訊中的 6 位數驗證碼" });
    await expect(code).toHaveAttribute("autocomplete", "one-time-code");
    await expect(code).toHaveAttribute("inputmode", "numeric");
    await expect(page.getByLabel("師傅要怎麼稱呼你？")).toBeVisible();
    await expect(page.getByRole("link", { name: "服務條款" })).toHaveAttribute("target", "_blank");
    await expect(page.getByRole("link", { name: "隱私政策" })).toHaveAttribute("target", "_blank");
  });

  test("手機號碼格式不對，不會送出", async ({ page }) => {
    await page.goto("/zh-TW/login");
    await page.getByLabel("手機號碼").fill("02-2700-1234");
    await page.getByRole("button", { name: "傳送驗證碼" }).click();
    await expect(page.locator("form [role=alert]")).toHaveText("請輸入 10 位數字的手機號碼");
  });

  test("沒送驗證碼就按登入，會提示先傳送", async ({ page }) => {
    await page.goto("/zh-TW/login");
    await page.getByRole("button", { name: "登入", exact: true }).click();
    await expect(page.locator("form [role=alert]")).toHaveText("請先傳送驗證碼");
  });

  test("資安：?next= 是別的網站也不會出現在頁面上的連結裡", async ({ page }) => {
    await page.goto("/zh-TW/login?next=https://evil.example/");
    await expect(page.locator('a[href*="evil.example"]')).toHaveCount(0);
  });

  test("英文版", async ({ page }) => {
    await page.goto("/en/login");
    await expect(page.getByRole("heading", { level: 1, name: "Log in or sign up" })).toBeVisible();
  });
});

test.describe("登出", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("會員和師傅選單的登出是表單按鈕（POST），不是連結", async ({ page }) => {
    for (const header of ["member", "tech"]) {
      await page.goto(`/zh-TW/dev/layout?header=${header}&footer=compact`);
      await page.getByTestId("menu-trigger").click();
      const dialog = page.getByTestId("menu-dialog");
      const logout = dialog.getByRole("button", { name: "登出" });
      await expect(logout).toHaveAttribute("type", "submit");
      await expect(logout.locator("xpath=ancestor::form")).toHaveCount(1);
      await expect(dialog.getByRole("link", { name: "登出" })).toHaveCount(0);
      await page.keyboard.press("Escape");
    }
  });
});
