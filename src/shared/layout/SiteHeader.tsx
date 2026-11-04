import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/shared/i18n/LanguageSwitcher";
import { Link } from "@/shared/i18n/navigation";
import { routeHref } from "@/shared/navigation/routes";
import { Icon } from "@/shared/ui/Icon";
import { Container } from "./Container";
import { MenuDialog } from "./MenuDialog";
import { GuestMenu, MemberMenu, TechMenu } from "./Menus";
import type { HeaderUser, HeaderVariant, MemberNavKey, TechNavKey } from "./types";
import styles from "./SiteHeader.module.css";

type Props =
  | { variant: "guest" }
  | {
      variant: "member";
      user?: HeaderUser;
      current?: MemberNavKey;
      unreadNotifications?: boolean;
    }
  | {
      variant: "tech";
      user?: HeaderUser;
      current?: TechNavKey;
      unreadMessages?: boolean;
      /** 師傅自己的 UUID，選單裡「看客戶眼中的我的個人頁」用 */
      publicProfileId?: string;
    };

async function Brand({ variant, withTagline }: { variant: HeaderVariant; withTagline: boolean }) {
  const t = await getTranslations("layout");
  const home =
    variant === "member"
      ? routeHref("dashboard")
      : variant === "tech"
        ? routeHref("techHome")
        : routeHref("home");
  return (
    <Link href={home} className={styles.brand} aria-label={`${t("brand")} · ${t("homeLabel")}`}>
      <span className={styles.logo}>
        <Icon name="shieldCheck" size={22} />
      </span>
      <span className={styles.brandText}>
        <span className={styles.name}>{t("brand")}</span>
        {withTagline && <span className={styles.tagline}>{t("tagline")}</span>}
      </span>
      {variant === "tech" && <span className={styles.techTag}>{t("techTag")}</span>}
    </Link>
  );
}

/**
 * 頁首：未登入、會員、師傅三種（後台用 AdminShell）。
 * 資安：只顯示稱呼和頭像上的第一個字，不顯示手機號碼等個資；通知只顯示紅點。
 */
export async function SiteHeader(props: Props) {
  const t = await getTranslations("layout");
  const { variant } = props;

  const nav =
    variant === "guest"
      ? [
          { key: "services", href: routeHref("services"), label: t("guestNav.services") },
          { key: "safety", href: `${routeHref("home")}#safety`, label: t("guestNav.safety") },
          { key: "technicians", href: routeHref("technicians"), label: t("guestNav.technicians") },
          { key: "pricing", href: `${routeHref("home")}#pricing`, label: t("guestNav.pricing") },
          { key: "join", href: routeHref("join"), label: t("guestNav.join") },
        ]
      : variant === "member"
        ? [
            { key: "dashboard", href: routeHref("dashboard"), label: t("memberNav.dashboard") },
            {
              key: "technicians",
              href: routeHref("technicians"),
              label: t("memberNav.technicians"),
            },
            { key: "records", href: routeHref("records"), label: t("memberNav.records") },
            { key: "myHome", href: routeHref("myHome"), label: t("memberNav.myHome") },
          ]
        : [
            { key: "home", href: routeHref("techHome"), label: t("techNav.home") },
            { key: "schedule", href: routeHref("techSchedule"), label: t("techNav.schedule") },
            { key: "earnings", href: routeHref("techEarnings"), label: t("techNav.earnings") },
            { key: "profile", href: routeHref("techProfile"), label: t("techNav.profile") },
          ];
  const current = variant === "guest" ? undefined : props.current;
  const user = variant === "guest" ? undefined : props.user;

  const menu = (
    <MenuDialog
      brand={<Brand variant={variant} withTagline={false} />}
      menuLabel={t("menu")}
      closeLabel={t("closeMenu")}
    >
      {variant === "guest" ? (
        <GuestMenu />
      ) : variant === "member" ? (
        <MemberMenu user={user} />
      ) : (
        <TechMenu user={user} publicProfileId={props.publicProfileId} />
      )}
    </MenuDialog>
  );

  return (
    <header className={styles.header} data-variant={variant}>
      <Container className={styles.inner}>
        <div className={styles.left}>
          <Brand variant={variant} withTagline={variant === "guest"} />
          <nav aria-label={t("mainMenu")} className={styles.nav}>
            {nav.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={styles.navLink}
                aria-current={item.key === current ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className={styles.actions}>
          <span className={styles.desktop}>
            <LanguageSwitcher variant="desktop" />
          </span>

          {variant === "guest" && (
            <>
              <span className={styles.wide}>
                <Link href={routeHref("login")} className={styles.login}>
                  {t("login")}
                </Link>
              </span>
              <Link href={routeHref("login")} className={styles.register}>
                {t("register")}
              </Link>
            </>
          )}

          {variant === "member" && (
            <>
              <Link
                href={routeHref("notifications")}
                className={styles.iconButton}
                aria-label={
                  props.unreadNotifications ? t("notificationsUnread") : t("notifications")
                }
              >
                <Icon name="bell" size={22} />
                {props.unreadNotifications && <span className={styles.dot} />}
              </Link>
              <span className={styles.wide}>
                <Link
                  href={routeHref("messages")}
                  className={styles.iconButton}
                  aria-label={t("messages")}
                >
                  <Icon name="message" size={22} />
                </Link>
              </span>
            </>
          )}

          {variant === "tech" && (
            <Link
              href={routeHref("techMessages")}
              className={styles.iconButton}
              aria-label={props.unreadMessages ? t("messagesUnread") : t("messages")}
            >
              <Icon name="message" size={22} />
              {props.unreadMessages && <span className={styles.dot} />}
            </Link>
          )}

          {user && (
            <span className={styles.wide}>
              <Link
                href={variant === "tech" ? routeHref("techHome") : routeHref("dashboard")}
                className={styles.account}
              >
                <span className={styles.avatar} aria-hidden="true">
                  {Array.from(user.displayName)[0]}
                </span>
                <span className={styles.accountName}>{user.displayName}</span>
              </Link>
            </span>
          )}

          <span className={styles.narrowOnly}>{menu}</span>
        </div>
      </Container>
    </header>
  );
}
