import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import proxy, { config } from "./proxy";

function get(path: string, headers: Record<string, string> = {}) {
  // 直接接在網址後面（不用 new URL(path, base)，否則 //evil 會被解析成別的網站）
  return proxy(new NextRequest(`http://localhost:3000${path}`, { headers }));
}

function location(res: Response) {
  const value = res.headers.get("location");
  return value ? new URL(value) : null;
}

describe("語言轉址", () => {
  it.each([
    ["en-US,en;q=0.9", "/en"],
    ["ja", "/en"],
    ["zh-TW,zh;q=0.9", "/zh-TW"],
    ["zh-CN", "/zh-TW"],
  ])("第一次進網站照瀏覽器語言：%s → %s", async (acceptLanguage, expected) => {
    const res = await get("/", { "accept-language": acceptLanguage });
    expect(location(res)?.pathname).toBe(expected);
  });

  it("瀏覽器沒有送語言 → 繁中", async () => {
    expect(location(await get("/"))?.pathname).toBe("/zh-TW");
  });

  it("切換過語言（cookie）就照 cookie，不看瀏覽器語言", async () => {
    const res = await get("/", { "accept-language": "en-US", cookie: "NEXT_LOCALE=zh-TW" });
    expect(location(res)?.pathname).toBe("/zh-TW");
  });

  it("cookie 的值不合法就照瀏覽器語言", async () => {
    const res = await get("/", { "accept-language": "en-US", cookie: "NEXT_LOCALE=fr" });
    expect(location(res)?.pathname).toBe("/en");
  });

  it("資安：超長、亂寫的瀏覽器語言不會出錯，當成沒送", async () => {
    const res = await get("/", { "accept-language": "<script>".repeat(500) });
    expect(location(res)?.pathname).toBe("/zh-TW");
  });

  it("選過英文（cookie）就用英文", async () => {
    const res = await get("/", { cookie: "NEXT_LOCALE=en" });
    expect(location(res)?.pathname).toBe("/en");
  });

  it("cookie 的值不是支援的語言就忽略", async () => {
    const res = await get("/", { cookie: "NEXT_LOCALE=../../evil" });
    expect(location(res)?.pathname).toBe("/zh-TW");
  });

  it("有語言的網址不轉址", async () => {
    for (const path of ["/zh-TW", "/en/dev/i18n"]) {
      expect(location(await get(path))).toBeNull();
    }
  });

  it("不支援的語言當成一般路徑，轉到 /zh-TW/...（之後顯示 404）", async () => {
    const res = await get("/fr/anything");
    expect(location(res)?.pathname).toBe("/zh-TW/fr/anything");
  });

  it.each([
    "//evil.example.com",
    "///evil.example.com",
    "/\\evil.example.com",
    "/%2F%2Fevil.example.com",
    "/%5Cevil.example.com",
  ])("資安：%s 只會轉到本站，不會被當成跳到其他網站的跳板", async (path) => {
    const target = location(await get(path));
    expect(target?.origin).toBe("http://localhost:3000");
    expect(target?.pathname.startsWith("/zh-TW/")).toBe(true);
  });
});

describe("哪些網址不經過語言轉址", () => {
  const matcher = new RegExp(`^${config.matcher[0]}$`);
  it.each(["/health", "/internal/events/process", "/_next/static/x.js", "/favicon.ico"])(
    "%s 不經過",
    (path) => {
      expect(matcher.test(path)).toBe(false);
    },
  );
  it.each(["/", "/zh-TW", "/en/dev/i18n", "/services"])("%s 會經過", (path) => {
    expect(matcher.test(path)).toBe(true);
  });
});

describe("CSP（每次請求產生 nonce）", () => {
  function nonceOf(res: Response) {
    const csp = res.headers.get("content-security-policy") ?? "";
    return /'nonce-([^']+)'/.exec(csp)?.[1];
  }

  it("回應有 CSP，nonce 格式正確", async () => {
    const res = await get("/zh-TW");
    expect(nonceOf(res)).toMatch(/^[A-Za-z0-9+/]{22}==$/);
  });

  it("每次請求的 nonce 都不同", async () => {
    const nonces = await Promise.all(
      Array.from({ length: 20 }, async () => nonceOf(await get("/zh-TW"))),
    );
    expect(new Set(nonces).size).toBe(20);
  });

  it("帶 nonce 的回應不能被快取", async () => {
    const res = await get("/zh-TW");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("把 nonce 交給頁面（x-nonce），而且和回應的 CSP 是同一個", async () => {
    const res = await get("/zh-TW");
    const forwarded = res.headers.get("x-middleware-request-x-nonce");
    expect(forwarded).toBe(nonceOf(res));
  });
});
