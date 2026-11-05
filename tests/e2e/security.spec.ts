import { expect, test, type Page } from "@playwright/test";

/**
 * 資安標頭和 CSP（#6）。開發模式的 CSP 是「擋下」，被擋的東西會在瀏覽器主控台出現。
 */

const PAGES = [
  "/zh-TW",
  "/en",
  "/zh-TW/services",
  "/zh-TW/dashboard",
  "/zh-TW/dev/layout?header=member&footer=compact",
  "/zh-TW/dev/layout/admin",
  "/zh-TW/dev/ui",
  "/zh-TW/video/abc123/wait",
];

/** 收集主控台裡的 CSP 違規 */
function watchCsp(page: Page) {
  const violations: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (/Content[- ]Security[- ]Policy/i.test(text)) violations.push(text);
  });
  return violations;
}

function nonceOf(csp: string | null) {
  return /'nonce-([^']+)'/.exec(csp ?? "")?.[1];
}

for (const path of PAGES) {
  test(`CSP 沒有擋到自己網站的東西：${path}`, async ({ page }) => {
    const violations = watchCsp(page);
    const res = await page.goto(path);
    expect(res?.headers()["content-security-policy"]).toBeTruthy();
    // Turnstile 會一直和 Cloudflare 連線，等不到 networkidle；載入完再多等一下讓程式跑完
    await page.waitForLoadState("load");
    await page.waitForTimeout(2000);
    expect(violations).toEqual([]);
  });
}

test("頁面上所有 <script> 都帶這次請求的 nonce，和回應的 CSP 一樣", async ({ request }) => {
  const res = await request.get("/zh-TW");
  const nonce = nonceOf(res.headers()["content-security-policy"]);
  expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
  const html = await res.text();
  const scripts = html.match(/<script\b[^>]*>/g) ?? [];
  expect(scripts.length).toBeGreaterThan(0);
  for (const tag of scripts) expect(tag).toContain(`nonce="${nonce}"`);
});

test("每次請求的 nonce 都不同，而且不會被快取", async ({ request }) => {
  const nonces = new Set<string | undefined>();
  for (let i = 0; i < 5; i++) {
    const res = await request.get("/zh-TW");
    nonces.add(nonceOf(res.headers()["content-security-policy"]));
    expect(res.headers()["cache-control"]).toContain("no-store");
  }
  expect(nonces.size).toBe(5);
});

test("被插入 HTML、沒有 nonce 的程式不會執行（模擬 XSS）", async ({ page }) => {
  const violations = watchCsp(page);
  // 模擬攻擊者的內容混進伺服器回來的 HTML：一段 <script>，一個 onerror 屬性。CSP 標頭照原樣。
  await page.route("**/zh-TW", async (route) => {
    const res = await route.fetch();
    const html = (await res.text()).replace(
      "</body>",
      '<script>window.__xss1 = true</script><img src="/x.png" onerror="window.__xss2 = true"></body>',
    );
    await route.fulfill({ response: res, body: html });
  });
  await page.goto("/zh-TW");
  await page.waitForLoadState("networkidle");
  const ran = await page.evaluate(() => {
    const w = window as unknown as { __xss1?: boolean; __xss2?: boolean };
    return { script: w.__xss1 === true, handler: w.__xss2 === true };
  });
  expect(ran).toEqual({ script: false, handler: false });
  expect(violations.length).toBeGreaterThanOrEqual(2);
});

test("所有回應都有安全標頭", async ({ request }) => {
  for (const path of ["/zh-TW", "/health", "/favicon.ico"]) {
    const h = (await request.get(path)).headers();
    expect(h["strict-transport-security"], path).toBe("max-age=31536000; includeSubDomains");
    expect(h["x-frame-options"], path).toBe("DENY");
    expect(h["x-content-type-options"], path).toBe("nosniff");
    expect(h["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
    expect(h["cross-origin-opener-policy"], path).toBe("same-origin");
    expect(h["x-powered-by"], path).toBeUndefined();
  }
});

test("攝影機、麥克風只開放給視訊等待室、視訊室、師傅端視訊室", async ({ request }) => {
  for (const path of ["/zh-TW/video/abc123/wait", "/zh-TW/video/abc123", "/en/tech/video/abc123"]) {
    const policy = (await request.get(path)).headers()["permissions-policy"];
    expect(policy, path).toContain("camera=(self)");
    expect(policy, path).toContain("microphone=(self)");
    expect(policy, path).toContain("geolocation=()");
  }
  for (const path of ["/zh-TW", "/zh-TW/video/abc123/summary", "/zh-TW/dashboard"]) {
    const policy = (await request.get(path)).headers()["permissions-policy"];
    expect(policy, path).toContain("camera=()");
    expect(policy, path).toContain("microphone=()");
  }
});

test("Turnstile（測試金鑰）在 CSP 下可以載入並通過", async ({ page }) => {
  const violations = watchCsp(page);
  await page.goto("/zh-TW/dev/ui");
  const field = page.locator('[data-testid="turnstile"] input[name="cf-turnstile-response"]');
  await expect(field).toHaveValue(/.+/, { timeout: 30_000 });
  expect(violations).toEqual([]);
});
