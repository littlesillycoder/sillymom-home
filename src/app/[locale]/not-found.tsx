import { useTranslations } from "next-intl";
import { Link } from "@/shared/i18n/navigation";

// 正式的錯誤頁設計在「錯誤頁」issue 實作。
export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <main>
      <h1>{t("title")}</h1>
      <Link href="/">{t("backHome")}</Link>
    </main>
  );
}
