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
  it("打開 / 一律用繁中，不照瀏覽器語言", async () => {
    const res = await get("/", { "accept-language": "en-US,en;q=0.9" });
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
