// auth 模組「只能在伺服器端用」的公開介面（#11）。頁面、Route Handler 從這裡 import；
// 瀏覽器端元件從 index.ts import（這個檔案有 server-only，不能進瀏覽器）。
import "server-only";

export {
  destinationFor,
  getSession,
  hasAccess,
  requireAccess,
  type Session,
} from "./server/session";
export { handleSendSmsHook } from "./server/send-sms-hook";
