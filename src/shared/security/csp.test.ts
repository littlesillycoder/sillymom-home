import { describe, expect, it, vi } from "vitest";
import { buildCsp, cspHeaderName, generateNonce, NONCE_PATTERN, resolveCspMode } from "./csp";

function directives(csp: string) {
  return Object.fromEntries(
    csp.split("; ").map((part) => {
      const [name, ...values] = part.split(" ");
      return [name, values];
    }),
  );
}

describe("nonce", () => {
  it("格式是 16 bytes 的 base64", () => {
    expect(generateNonce()).toMatch(NONCE_PATTERN);
  });

  it("每次都不同（產生 1000 個沒有重複）", () => {
    const set = new Set(Array.from({ length: 1000 }, generateNonce));
    expect(set.size).toBe(1000);
  });

  it("用的是加密等級的亂數（crypto.getRandomValues）", () => {
    const spy = vi.spyOn(crypto, "getRandomValues");
    generateNonce();
    expect(spy).toHaveBeenCalledOnce();
    expect((spy.mock.calls[0][0] as Uint8Array).length).toBe(16);
    spy.mockRestore();
  });
});

describe("CSP 內容", () => {
  const nonce = "AAAAAAAAAAAAAAAAAAAAAA==";
  const prod = directives(
    buildCsp({ nonce, isDev: false, supabaseUrl: "https://abc.supabase.co" }),
  );

  it("程式只能執行帶 nonce 的（不允許 unsafe-inline、unsafe-eval）", () => {
    expect(prod["script-src"]).toContain(`'nonce-${nonce}'`);
    expect(prod["script-src"]).toContain("'strict-dynamic'");
    expect(prod["script-src"]).not.toContain("'unsafe-inline'");
    expect(prod["script-src"]).not.toContain("'unsafe-eval'");
    expect(prod["style-src"]).not.toContain("'unsafe-inline'");
  });

  it("其他項目鎖住", () => {
    expect(prod["default-src"]).toEqual(["'self'"]);
    expect(prod["object-src"]).toEqual(["'none'"]);
    expect(prod["base-uri"]).toEqual(["'self'"]);
    expect(prod["form-action"]).toEqual(["'self'"]);
    expect(prod["frame-ancestors"]).toEqual(["'none'"]);
    expect(prod["upgrade-insecure-requests"]).toEqual([]);
  });

  it("只連得到自己、Supabase（含即時連線）", () => {
    expect(prod["connect-src"]).toEqual([
      "'self'",
      "https://abc.supabase.co",
      "wss://abc.supabase.co",
    ]);
  });

  it("只能嵌入 Turnstile", () => {
    expect(prod["frame-src"]).toEqual(["https://challenges.cloudflare.com"]);
  });

  it("本機開發才有 unsafe-eval 和 ws:，正式不會有", () => {
    const dev = directives(buildCsp({ nonce, isDev: true, supabaseUrl: undefined }));
    expect(dev["script-src"]).toContain("'unsafe-eval'");
    expect(dev["connect-src"]).toContain("ws:");
    expect(dev["upgrade-insecure-requests"]).toBeUndefined();
    // 開發時 Next.js 會插入沒有 nonce 的 <style>；程式（script-src）照樣不放寬
    expect(dev["style-src"]).toContain("'unsafe-inline'");
    expect(dev["script-src"]).not.toContain("'unsafe-inline'");
    expect(prod["connect-src"]).not.toContain("ws:");
  });

  it.each([undefined, "", "not a url", "javascript:alert(1)"])(
    "Supabase 網址沒設定或不合法（%s）就不加",
    (url) => {
      const d = directives(buildCsp({ nonce, isDev: false, supabaseUrl: url }));
      expect(d["connect-src"]).toEqual(["'self'"]);
    },
  );
});

describe("CSP 擋下或只回報", () => {
  it("沒設定：本機和正式擋下，預覽和展示只回報", () => {
    expect(resolveCspMode("development", undefined)).toBe("enforce");
    expect(resolveCspMode("preview", undefined)).toBe("report-only");
    expect(resolveCspMode("demo", undefined)).toBe("report-only");
    expect(resolveCspMode("production", undefined)).toBe("enforce");
  });

  it("有設定就照設定", () => {
    expect(resolveCspMode("preview", "enforce")).toBe("enforce");
    expect(resolveCspMode("development", "report-only")).toBe("report-only");
  });

  it("正式環境設成 report-only 直接報錯", () => {
    expect(() => resolveCspMode("production", "report-only")).toThrow(/正式環境/);
  });

  it("設定錯的值直接報錯", () => {
    expect(() => resolveCspMode("preview", "off")).toThrow(/CSP_MODE/);
  });

  it("標頭名稱", () => {
    expect(cspHeaderName("enforce")).toBe("Content-Security-Policy");
    expect(cspHeaderName("report-only")).toBe("Content-Security-Policy-Report-Only");
  });
});
