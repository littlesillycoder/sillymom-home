// auth 模組的公開介面：別的模組和頁面只能 import 這個檔案（伺服器端專用的在 server.ts）。
export { PhoneOtpForm } from "./components/PhoneOtpForm";
export { safeNextPath } from "./next-path";
export { formatLocalPhone, normalizePhone } from "./phone";
export { ADMIN_ROLES, isAdmin, landingRoute, ROLES, type Role } from "./roles";
