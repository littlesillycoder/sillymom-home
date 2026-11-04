import type { Locale } from "@/shared/config/regions";
import type { NotifyTemplate, TemplateParams } from "../templates";

/** 通知介面：送給指定使用者，由實作決定走 LINE、簡訊或 Email。只能用事先定好的範本。 */
export interface NotifyProvider {
  readonly implementation: string;
  notify(input: {
    /** 收件人的會員編號（UUID） */
    recipientId: string;
    /** 收件人的語言 */
    locale: Locale;
    template: NotifyTemplate;
    params: TemplateParams;
  }): Promise<void>;
}
