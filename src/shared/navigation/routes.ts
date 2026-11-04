/**
 * 所有頁面的網址（不含語言）。導覽連結一律用這裡的網址；還沒做的頁面 built: false，
 * 打開會顯示「建置中」，不在清單裡的網址是 404。
 *
 * 資安：
 * - 網址不放個資。
 * - [id] 只接受 UUID（不能猜的亂數），不用流水號；[category] 只接受小寫英文和連字號。
 */
export type Area = "public" | "flow" | "member" | "tech" | "admin";
export type FooterMode = "full" | "compact" | "none";

type RouteDef = { pattern: string; area: Area; built: boolean };

export const ROUTES = {
  // 公開頁面
  home: { pattern: "/", area: "public", built: true },
  services: { pattern: "/services", area: "public", built: false },
  serviceCategory: { pattern: "/services/[category]", area: "public", built: false },
  technicians: { pattern: "/technicians", area: "public", built: false },
  technician: { pattern: "/technicians/[id]", area: "public", built: false },
  technicianReviews: { pattern: "/technicians/[id]/reviews", area: "public", built: false },
  safety: { pattern: "/safety", area: "public", built: false },
  howItWorks: { pattern: "/how-it-works", area: "public", built: false },
  help: { pattern: "/help", area: "public", built: false },
  terms: { pattern: "/terms", area: "public", built: false },
  privacy: { pattern: "/privacy", area: "public", built: false },
  join: { pattern: "/join", area: "public", built: false },
  login: { pattern: "/login", area: "public", built: false },
  // 求助流程（沒有頁尾）
  request: { pattern: "/request", area: "flow", built: false },
  requestVerify: { pattern: "/request/verify", area: "flow", built: false },
  requestMatch: { pattern: "/request/match", area: "flow", built: false },
  requestCheckout: { pattern: "/request/checkout", area: "flow", built: false },
  videoWait: { pattern: "/video/[id]/wait", area: "flow", built: false },
  videoRoom: { pattern: "/video/[id]", area: "flow", built: false },
  videoSummary: { pattern: "/video/[id]/summary", area: "flow", built: false },
  homeVisitTrack: { pattern: "/home-visit/[id]", area: "flow", built: false },
  // 會員
  dashboard: { pattern: "/dashboard", area: "member", built: false },
  notifications: { pattern: "/notifications", area: "member", built: false },
  messages: { pattern: "/messages", area: "member", built: false },
  messageThread: { pattern: "/messages/[id]", area: "member", built: false },
  records: { pattern: "/records", area: "member", built: false },
  record: { pattern: "/records/[id]", area: "member", built: false },
  openRequest: { pattern: "/open-requests/[id]", area: "member", built: false },
  report: { pattern: "/report", area: "member", built: false },
  homeVisitBook: { pattern: "/home-visit/book", area: "member", built: false },
  homeVisitChange: { pattern: "/home-visit/[id]/change", area: "member", built: false },
  myHome: { pattern: "/my-home", area: "member", built: false },
  addressEdit: { pattern: "/my-home/address", area: "member", built: false },
  favorites: { pattern: "/favorites", area: "member", built: false },
  account: { pattern: "/account", area: "member", built: false },
  lineBind: { pattern: "/line", area: "member", built: false },
  // 師傅
  techHome: { pattern: "/tech", area: "tech", built: false },
  techSchedule: { pattern: "/tech/schedule", area: "tech", built: false },
  techVideo: { pattern: "/tech/video/[id]", area: "tech", built: false },
  techDiagnosis: { pattern: "/tech/diagnosis/[id]", area: "tech", built: false },
  techJob: { pattern: "/tech/jobs/[id]", area: "tech", built: false },
  techRateCustomer: { pattern: "/tech/jobs/[id]/rate", area: "tech", built: false },
  techEarnings: { pattern: "/tech/earnings", area: "tech", built: false },
  techProfile: { pattern: "/tech/profile", area: "tech", built: false },
  techMessages: { pattern: "/tech/messages", area: "tech", built: false },
  techTerms: { pattern: "/tech/terms", area: "tech", built: false },
  techApply: { pattern: "/tech/apply", area: "tech", built: false },
  techApplyTerms: { pattern: "/tech/apply/terms", area: "tech", built: false },
  techApplyStatus: { pattern: "/tech/apply/status", area: "tech", built: false },
  // 後台
  admin: { pattern: "/admin", area: "admin", built: false },
  adminTechnicians: { pattern: "/admin/technicians", area: "admin", built: false },
  adminDisputes: { pattern: "/admin/disputes", area: "admin", built: false },
  adminMembers: { pattern: "/admin/members", area: "admin", built: false },
  adminFinance: { pattern: "/admin/finance", area: "admin", built: false },
  adminSettings: { pattern: "/admin/settings", area: "admin", built: false },
} as const satisfies Record<string, RouteDef>;

export type RouteKey = keyof typeof ROUTES;

const PARAM_PATTERNS: Record<string, RegExp> = {
  id: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  category: /^[a-z][a-z-]{0,39}$/,
};

/** 頁尾模式（docs/設計補充/設計補充.md 第 2 節）：公開 full、會員和師傅 compact、流程和後台 none。 */
export function footerModeFor(area: Area): FooterMode {
  return area === "public" ? "full" : area === "member" || area === "tech" ? "compact" : "none";
}

/** 依網址找到清單上的頁面；不在清單上或參數格式不對回傳 null。 */
export function matchRoute(path: string): { key: RouteKey; area: Area; built: boolean } | null {
  const parts = path.split("/").filter(Boolean);
  for (const [key, def] of Object.entries(ROUTES) as [RouteKey, RouteDef][]) {
    const segments = def.pattern.split("/").filter(Boolean);
    if (segments.length !== parts.length) continue;
    const ok = segments.every((segment, i) => {
      const param = /^\[(\w+)\]$/.exec(segment)?.[1];
      return param ? PARAM_PATTERNS[param].test(parts[i]) : segment === parts[i];
    });
    if (ok) return { key, area: def.area, built: def.built };
  }
  return null;
}

/** 組出網址，例如 routeHref("technician", { id })。參數格式不對會丟錯。 */
export function routeHref(key: RouteKey, params: Record<string, string> = {}): string {
  return ROUTES[key].pattern.replace(/\[(\w+)\]/g, (_, name: string) => {
    const value = params[name];
    if (!value || !PARAM_PATTERNS[name].test(value)) {
      throw new Error(`網址參數格式錯誤：${key}.${name}`);
    }
    return value;
  });
}
