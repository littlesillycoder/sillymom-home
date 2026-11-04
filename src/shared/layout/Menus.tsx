import { getTranslations } from "next-intl/server";
import { Link } from "@/shared/i18n/navigation";
import { routeHref } from "@/shared/navigation/routes";
import { ButtonLink } from "@/shared/ui/Button";
import { Icon } from "@/shared/ui/Icon";
import type { HeaderUser } from "./types";
import styles from "./Menus.module.css";

type Item = { href: string; label: string };

function MenuList({ label, items }: { label: string; items: Item[] }) {
  return (
    <nav aria-label={label} className={styles.nav}>
      {items.map((item) => (
        <Link key={item.label} href={item.href} className={styles.item}>
          {item.label}
          <span className={styles.chevron}>
            <Icon name="chevronRight" size={20} />
          </span>
        </Link>
      ))}
    </nav>
  );
}

function UserCard({ user }: { user: HeaderUser }) {
  return (
    <div className={styles.card}>
      <span className={styles.cardAvatar} aria-hidden="true">
        {Array.from(user.displayName)[0]}
      </span>
      <span className={styles.cardText}>
        <span className={styles.cardName}>{user.displayName}</span>
        {user.statusText && <span className={styles.cardStatus}>{user.statusText}</span>}
      </span>
    </div>
  );
}

async function Emergency() {
  const t = await getTranslations("layout");
  return <p className={styles.emergency}>{t("emergency")}</p>;
}

/** 未登入選單（設計稿 MenuGuest）。 */
export async function GuestMenu() {
  const t = await getTranslations("layout");
  const items: Item[] = [
    { href: routeHref("home"), label: t("guestMenu.home") },
    { href: routeHref("services"), label: t("guestMenu.services") },
    { href: routeHref("technicians"), label: t("guestMenu.technicians") },
    { href: routeHref("safety"), label: t("guestMenu.safety") },
    { href: routeHref("terms"), label: t("guestMenu.pricing") },
    { href: routeHref("howItWorks"), label: t("guestMenu.howItWorks") },
    { href: `${routeHref("help")}#faq`, label: t("guestMenu.faq") },
    { href: routeHref("help"), label: t("guestMenu.help") },
    { href: routeHref("terms"), label: t("guestMenu.terms") },
    { href: routeHref("join"), label: t("guestMenu.join") },
  ];
  return (
    <>
      <MenuList label={t("mainMenu")} items={items} />
      <div className={styles.actions}>
        <ButtonLink href={routeHref("request")} size="lg" fullWidth>
          {t("guestMenu.cta")}
        </ButtonLink>
        <div className={styles.actionRow}>
          <ButtonLink href={routeHref("login")} variant="secondary" size="lg" fullWidth>
            {t("login")}
          </ButtonLink>
          <ButtonLink href={routeHref("login")} variant="secondary" size="lg" fullWidth>
            {t("register")}
          </ButtonLink>
        </div>
      </div>
      <Emergency />
    </>
  );
}

/** 會員選單（設計稿 Menu）。 */
export async function MemberMenu({ user }: { user?: HeaderUser }) {
  const t = await getTranslations("layout");
  const items: Item[] = [
    { href: routeHref("dashboard"), label: t("memberMenu.home") },
    { href: routeHref("technicians"), label: t("memberMenu.technicians") },
    { href: routeHref("records"), label: t("memberMenu.records") },
    { href: routeHref("messages"), label: t("memberMenu.messages") },
    { href: routeHref("notifications"), label: t("memberMenu.notifications") },
    { href: routeHref("myHome"), label: t("memberMenu.myHome") },
    { href: routeHref("favorites"), label: t("memberMenu.favorites") },
    { href: routeHref("account"), label: t("memberMenu.account") },
    { href: routeHref("help"), label: t("memberMenu.help") },
    { href: routeHref("terms"), label: t("memberMenu.terms") },
  ];
  return (
    <>
      {user && <UserCard user={user} />}
      <MenuList label={t("mainMenu")} items={items} />
      <div className={styles.actions}>
        <ButtonLink href={routeHref("request")} size="lg" fullWidth>
          {t("memberMenu.cta")}
        </ButtonLink>
        {/* 登出：#11 做登入時改成 POST（避免被別的網站用連結強制登出） */}
        <ButtonLink href={routeHref("home")} variant="secondary" fullWidth>
          {t("logout")}
        </ButtonLink>
      </div>
      <Emergency />
    </>
  );
}

/** 師傅選單（設計稿 TechMenu）。publicProfileId：師傅自己的 UUID，連到客戶看到的個人頁。 */
export async function TechMenu({
  user,
  publicProfileId,
}: {
  user?: HeaderUser;
  publicProfileId?: string;
}) {
  const t = await getTranslations("layout");
  const items: Item[] = [
    { href: routeHref("techHome"), label: t("techMenu.home") },
    { href: routeHref("techSchedule"), label: t("techMenu.schedule") },
    { href: routeHref("techMessages"), label: t("techMenu.messages") },
    { href: routeHref("techEarnings"), label: t("techMenu.earnings") },
    { href: routeHref("techProfile"), label: t("techMenu.profile") },
    { href: routeHref("techTerms"), label: t("techMenu.terms") },
    { href: routeHref("help"), label: t("techMenu.help") },
  ];
  return (
    <>
      {user && <UserCard user={user} />}
      <MenuList label={t("mainMenu")} items={items} />
      <div className={styles.actions}>
        {publicProfileId && (
          <ButtonLink
            href={routeHref("technician", { id: publicProfileId })}
            variant="secondary"
            size="lg"
            fullWidth
          >
            {t("techMenu.publicProfile")}
          </ButtonLink>
        )}
        {/* 登出：#11 做登入時改成 POST */}
        <ButtonLink href={routeHref("home")} variant="quiet" size="lg" fullWidth>
          {t("logout")}
        </ButtonLink>
      </div>
      <Emergency />
    </>
  );
}
