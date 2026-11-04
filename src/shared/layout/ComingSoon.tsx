import { getTranslations } from "next-intl/server";
import { routeHref } from "@/shared/navigation/routes";
import { ButtonLink } from "@/shared/ui/Button";
import { Container } from "./Container";
import styles from "./ComingSoon.module.css";

/** 「建置中」：清單上還沒做的頁面。資安：不顯示網址裡的任何內容。 */
export async function ComingSoon() {
  const t = await getTranslations("layout.comingSoon");
  return (
    <Container className={styles.wrap}>
      <h1>{t("title")}</h1>
      <p className={styles.body}>{t("body")}</p>
      <ButtonLink href={routeHref("home")} variant="secondary">
        {t("backHome")}
      </ButtonLink>
    </Container>
  );
}
