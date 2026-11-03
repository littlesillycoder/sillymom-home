import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/** 會自動加上語言的連結和導覽工具。頁面裡的站內連結都用這裡的 Link。 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
