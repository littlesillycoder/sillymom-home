import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { securityHeaderRules } from "./src/shared/security/headers";

const withNextIntl = createNextIntlPlugin("./src/shared/i18n/request.ts");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // 不在回應標頭顯示 X-Powered-By: Next.js（不透露用了什麼框架）
  poweredByHeader: false,
  // 安全標頭（#6）；CSP 在 src/proxy.ts
  async headers() {
    return securityHeaderRules();
  },
};

export default withNextIntl(nextConfig);
