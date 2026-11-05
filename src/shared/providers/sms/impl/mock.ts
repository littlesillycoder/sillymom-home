import { maskCode, maskPhone } from "../../log/mask";
import type { ProviderLogStore } from "../../log/types";
import { renderNotification, renderVerificationCode } from "../../templates";
import type { SmsProvider } from "../types";

/**
 * 簡訊 mock：不真的發送。紀錄只存遮罩後的手機和範本代號，不存驗證碼和內文。
 * 開發、展示用的固定驗證碼 123456 在 Supabase 的測試手機號碼設定，不在這裡。
 */
export function createMockSms(store: ProviderLogStore): SmsProvider {
  const implementation = "mock";
  return {
    implementation,

    async sendVerificationCode({ phone, code, locale }) {
      renderVerificationCode(locale, code); // 確認範本存在、可以組出內文
      await store.write({
        service: "sms",
        implementation,
        action: "sendVerificationCode",
        status: "success",
        resultCode: "OK",
        request: { to: maskPhone(phone), code: maskCode(), template: "verificationCode", locale },
      });
    },

    async sendMessage({ phone, locale, template, params }) {
      renderNotification(template, locale, params); // 範本不存在、參數有個資會丟錯
      await store.write({
        service: "sms",
        implementation,
        action: "sendMessage",
        status: "success",
        resultCode: "OK",
        request: { to: maskPhone(phone), template, caseId: params.caseId, locale },
      });
    },
  };
}
