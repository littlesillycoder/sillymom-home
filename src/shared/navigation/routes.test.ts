import { describe, expect, it } from "vitest";
import { footerModeFor, matchRoute, ROUTES, routeHref } from "./routes";

const UUID = "3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b";

describe("網址清單", () => {
  it("找得到清單上的頁面", () => {
    expect(matchRoute("/")).toMatchObject({ key: "home", built: true });
    expect(matchRoute("/services")).toMatchObject({ key: "services", area: "public" });
    expect(matchRoute(`/technicians/${UUID}`)).toMatchObject({ key: "technician" });
    expect(matchRoute("/services/aircon")).toMatchObject({ key: "serviceCategory" });
    expect(matchRoute("/admin/settings")).toMatchObject({ key: "adminSettings", area: "admin" });
  });

  it("不在清單上回傳 null（之後顯示 404）", () => {
    expect(matchRoute("/nope")).toBeNull();
    expect(matchRoute("/services/aircon/extra")).toBeNull();
  });

  it.each([
    "/technicians/1",
    "/technicians/123456",
    "/technicians/not-a-uuid",
    "/records/../admin",
    "/services/Aircon",
    "/services/<script>",
    "/services/%3Cscript%3E",
  ])("資安：參數格式不對就不算（%s）", (path) => {
    expect(matchRoute(path)).toBeNull();
  });

  it("組網址時參數格式不對會丟錯", () => {
    expect(routeHref("technician", { id: UUID })).toBe(`/technicians/${UUID}`);
    expect(() => routeHref("technician", { id: "1" })).toThrow();
    expect(() => routeHref("technician")).toThrow();
  });

  it("每個網址都只出現一次", () => {
    const patterns = Object.values(ROUTES).map((r) => r.pattern);
    expect(new Set(patterns).size).toBe(patterns.length);
  });

  it("頁尾模式：公開 full、會員和師傅 compact、流程和後台 none", () => {
    expect(footerModeFor("public")).toBe("full");
    expect(footerModeFor("member")).toBe("compact");
    expect(footerModeFor("tech")).toBe("compact");
    expect(footerModeFor("flow")).toBe("none");
    expect(footerModeFor("admin")).toBe("none");
  });
});
