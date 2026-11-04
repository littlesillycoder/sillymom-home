import { type AppEnv, getAppEnv } from "@/shared/config/env";
import { getRegion, type ProviderService, type Region } from "@/shared/config/regions";

const ENV_NAMES: Record<ProviderService, string> = {
  payment: "PAYMENT_PROVIDER",
  invoice: "INVOICE_PROVIDER",
  sms: "SMS_PROVIDER",
  notify: "NOTIFY_PROVIDER",
};

export class ProviderConfigError extends Error {
  name = "ProviderConfigError";
}

/**
 * 決定某個外部服務用哪一個實作（#4 執行方式第 3 點）：
 * - 環境變數 PAYMENT_PROVIDER 等，值必須在地區允許清單裡，否則報錯。
 * - 開發、預覽、展示沒設定時用 mock。
 * - 正式環境一定要明確設定，而且不能是 mock（不會假裝扣款、發送成功）。
 */
export function resolveImplementation(
  service: ProviderService,
  {
    env = process.env,
    appEnv = getAppEnv(),
    region = getRegion(),
  }: { env?: Record<string, string | undefined>; appEnv?: AppEnv; region?: Region } = {},
): string {
  const name = ENV_NAMES[service];
  const value = env[name]?.trim() || undefined;
  const allowed = region.providers[service];

  if (appEnv === "production") {
    if (!value) throw new ProviderConfigError(`正式環境必須設定 ${name}`);
    if (value === "mock") throw new ProviderConfigError(`正式環境不能用 mock：${name}`);
  }
  const chosen = value ?? "mock";
  if (!allowed.includes(chosen)) {
    throw new ProviderConfigError(
      `${name}=${chosen} 不在這個地區允許的清單：${allowed.join("、")}`,
    );
  }
  return chosen;
}
