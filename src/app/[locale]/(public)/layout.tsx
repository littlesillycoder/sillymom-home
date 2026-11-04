import { initRequestLocale } from "@/shared/i18n/request-locale";
import { PageShell } from "@/shared/layout";

/** 公開頁面：未登入頁首、完整頁尾。（登入後的頁首在 #11 依登入狀態切換） */
export default async function PublicLayout({ children }: LayoutProps<"/[locale]">) {
  await initRequestLocale();
  return (
    <PageShell header={{ variant: "guest" }} footer="full">
      {children}
    </PageShell>
  );
}
