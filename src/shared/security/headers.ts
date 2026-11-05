/**
 * 每個回應都加的安全標頭（#6），由 next.config.ts 套用到所有網址。
 * CSP 每次請求都不同（nonce），在 src/proxy.ts 加。
 *
 * 這個檔案會被 next.config.ts 載入，不能 import 其他專案檔案（設定檔不認得 @/ 路徑）。
 */

/** 不在這裡的權限一律關閉。攝影機、麥克風只開放給視訊的三頁（VIDEO_PATHS）。 */
const DENY_ALL = [
  "accelerometer",
  "autoplay",
  "bluetooth",
  "browsing-topics",
  "camera",
  "display-capture",
  "geolocation",
  "gyroscope",
  "hid",
  "magnetometer",
  "microphone",
  "midi",
  "payment",
  "publickey-credentials-get",
  "serial",
  "usb",
  "xr-spatial-tracking",
] as const;

function permissionsPolicy(allowSelf: readonly string[]): string {
  return DENY_ALL.map((name) => `${name}=${allowSelf.includes(name) ? "(self)" : "()"}`).join(", ");
}

export const PERMISSIONS_POLICY_DEFAULT = permissionsPolicy([]);
/** 視訊頁：攝影機、麥克風只限自己的網站使用（LiveKit 在我們的頁面裡執行，不需要開給別的網域）。 */
export const PERMISSIONS_POLICY_VIDEO = permissionsPolicy(["camera", "microphone", "autoplay"]);

/**
 * 需要攝影機、麥克風的頁面（src/shared/navigation/routes.ts）：
 * - videoWait：視訊等待室（檢查裝置）
 * - videoRoom：視訊室
 * - techVideo：師傅端視訊室
 * 格式是 next.config.ts headers() 的網址寫法；:locale 是 /zh-TW、/en。
 */
export const VIDEO_PATHS = [
  "/:locale/video/:id/wait",
  "/:locale/video/:id",
  "/:locale/tech/video/:id",
] as const;

export const SECURITY_HEADERS: ReadonlyArray<{ key: string; value: string }> = [
  // 強制 https 一年（含子網域）。preload 很難撤回，列在 docs/資安檢查清單.md 的上線前檢查。
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // 不准別的網站把我們的頁面嵌進去（CSP 的 frame-ancestors 'none' 是新寫法，這個給舊瀏覽器）
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 連到別的網站時只送網域，不送完整網址（網址可能有案件編號）
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: PERMISSIONS_POLICY_DEFAULT },
];

type HeaderRule = { source: string; headers: Array<{ key: string; value: string }> };

/** next.config.ts 的 headers()。同一個標頭被多條規則設定時，後面的蓋掉前面的，所以視訊頁放最後。 */
export function securityHeaderRules(): HeaderRule[] {
  return [
    { source: "/:path*", headers: [...SECURITY_HEADERS] },
    ...VIDEO_PATHS.map((source) => ({
      source,
      headers: [{ key: "Permissions-Policy", value: PERMISSIONS_POLICY_VIDEO }],
    })),
  ];
}
