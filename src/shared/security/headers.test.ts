import { describe, expect, it } from "vitest";
import {
  PERMISSIONS_POLICY_DEFAULT,
  PERMISSIONS_POLICY_VIDEO,
  SECURITY_HEADERS,
  securityHeaderRules,
} from "./headers";

describe("安全標頭", () => {
  const byKey = Object.fromEntries(SECURITY_HEADERS.map((h) => [h.key, h.value]));

  it("所有網址都有的標頭", () => {
    expect(byKey["Strict-Transport-Security"]).toBe("max-age=31536000; includeSubDomains");
    expect(byKey["X-Frame-Options"]).toBe("DENY");
    expect(byKey["X-Content-Type-Options"]).toBe("nosniff");
    expect(byKey["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(byKey["Cross-Origin-Opener-Policy"]).toBe("same-origin");
  });

  it("HSTS 先不加 preload（很難撤回，上線前再決定）", () => {
    expect(byKey["Strict-Transport-Security"]).not.toContain("preload");
  });

  it("一般頁面：攝影機、麥克風、定位、付款都關閉", () => {
    for (const name of ["camera", "microphone", "geolocation", "payment"]) {
      expect(PERMISSIONS_POLICY_DEFAULT).toContain(`${name}=()`);
    }
    expect(PERMISSIONS_POLICY_DEFAULT).not.toContain("(self)");
  });

  it("視訊頁：攝影機、麥克風只開給自己的網站，其他照樣關閉", () => {
    expect(PERMISSIONS_POLICY_VIDEO).toContain("camera=(self)");
    expect(PERMISSIONS_POLICY_VIDEO).toContain("microphone=(self)");
    expect(PERMISSIONS_POLICY_VIDEO).toContain("geolocation=()");
    expect(PERMISSIONS_POLICY_VIDEO).toContain("payment=()");
    expect(PERMISSIONS_POLICY_VIDEO).not.toContain("*");
  });

  it("視訊三頁的規則放在最後（後面的蓋掉前面的）", () => {
    const rules = securityHeaderRules();
    expect(rules[0].source).toBe("/:path*");
    expect(rules.slice(1).map((r) => r.source)).toEqual([
      "/:locale/video/:id/wait",
      "/:locale/video/:id",
      "/:locale/tech/video/:id",
    ]);
  });
});
