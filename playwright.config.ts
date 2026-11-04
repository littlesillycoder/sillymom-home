import { defineConfig } from "@playwright/test";

/**
 * 版面自動檢查（tests/e2e）。
 * - GitHub Actions：自己開開發伺服器（port 3100），用下載的 Chromium。
 * - 本機：用電腦上的 Google Chrome。已經在跑 pnpm dev 的話，
 *   設定 E2E_BASE_URL=http://localhost:3000 直接用它（同一個資料夾不能同時開兩個開發伺服器）。
 */
const CI = Boolean(process.env.CI);
const PORT = 3100;
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  workers: CI ? 2 : 4,
  retries: CI ? 1 : 0,
  timeout: 60_000,
  reporter: CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL,
    locale: "zh-TW",
    ...(CI ? {} : { channel: "chrome" }),
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `pnpm exec next dev --port ${PORT}`,
        url: `${baseURL}/zh-TW`,
        reuseExistingServer: !CI,
        timeout: 180_000,
        env: { APP_ENV: "development" },
      },
});
