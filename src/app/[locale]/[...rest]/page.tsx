import { notFound } from "next/navigation";
import { initRequestLocale } from "@/shared/i18n/request-locale";
import { AdminShell, ComingSoon, PageShell } from "@/shared/layout";
import { footerModeFor, matchRoute } from "@/shared/navigation/routes";

// 這一頁依網址判斷，不需要驗證快速顯示（否則開發模式會出現 instant 驗證提示）。
export const instant = false;

/**
 * 語言底下沒有實作的網址：
 * - 在網址清單上、還沒做 → 「建置中」（套用該區域的頁首、頁尾）
 * - 不在清單上（或參數格式不對）→ 404
 * 資安：只依清單判斷，不把網址內容顯示在畫面上。
 */
export default async function CatchAll({ params }: PageProps<"/[locale]/[...rest]">) {
  await initRequestLocale();
  const { rest } = await params;
  const route = matchRoute(`/${rest.join("/")}`);
  if (!route || route.built) notFound();

  if (route.area === "admin") {
    return (
      <AdminShell>
        <ComingSoon />
      </AdminShell>
    );
  }

  const header =
    route.area === "member"
      ? ({ variant: "member" } as const)
      : route.area === "tech"
        ? ({ variant: "tech" } as const)
        : ({ variant: "guest" } as const);

  return (
    <PageShell header={header} footer={footerModeFor(route.area)}>
      <ComingSoon />
    </PageShell>
  );
}
