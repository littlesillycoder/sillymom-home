import type { Locale } from "@/shared/config/regions";
import type { NotifyTemplate, TemplateParams } from "../templates";

/**
 * 簡訊介面。驗證碼由 Supabase Auth 產生和比對（Send SMS Hook，#11），這裡只負責送出去。
 * 一般簡訊只能用事先定好的範本。
 */
export interface SmsProvider {
  readonly implementation: string;
  sendVerificationCode(input: { phone: string; code: string; locale: Locale }): Promise<void>;
  sendMessage(input: {
    phone: string;
    locale: Locale;
    template: NotifyTemplate;
    params: TemplateParams;
  }): Promise<void>;
}
