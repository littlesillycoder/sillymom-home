import type { ProviderLogStore } from "../../log/types";
import { renderNotification } from "../../templates";
import type { NotifyProvider } from "../types";

/**
 * 通知 mock：不真的發送。紀錄只存範本代號和案件編號，不存內文
 * （內文之後可能有地址、姓名）。
 */
export function createMockNotify(store: ProviderLogStore): NotifyProvider {
  const implementation = "mock";
  return {
    implementation,
    async notify({ locale, template, params }) {
      renderNotification(template, locale, params); // 範本不存在、參數有個資會丟錯
      await store.write({
        service: "notify",
        implementation,
        action: "notify",
        status: "success",
        resultCode: "OK",
        request: { template, caseId: params.caseId },
      });
    },
  };
}
