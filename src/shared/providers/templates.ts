import { createTranslator } from "next-intl";
import type { Locale } from "@/shared/config/regions";
import { findForbiddenKeys } from "@/shared/events/pii";
import en from "@/shared/i18n/messages/en.json";
import zhTW from "@/shared/i18n/messages/zh-TW.json";

/**
 * 通知、簡訊範本（#4 執行方式第 5 點）：只能用事先定好的範本代號＋參數，不接受任意文字。
 * 範本有繁中、英文，放在語言檔 providerTemplates；依收件人的語言送出。
 */
export const NOTIFY_TEMPLATES = [
  "bookingAccepted",
  "videoStartingSoon",
  "homeVisitOnTheWay",
] as const;
export type NotifyTemplate = (typeof NOTIFY_TEMPLATES)[number];

export type TemplateParams = {
  /** 案件編號（紀錄只存這個） */
  caseId: string;
  /** 已經依收件人時區格式化好的時間，例如「15:30」 */
  time?: string;
};

const MESSAGES = { "zh-TW": zhTW, en } as const;

export class TemplateError extends Error {
  name = "TemplateError";
}

/** 參數不能有個資欄位（姓名、地址、電話…），只放編號、時間。 */
export function assertSafeParams(params: Record<string, unknown>): void {
  const bad = findForbiddenKeys(params);
  if (bad.length > 0) throw new TemplateError(`範本參數不能有個資欄位：${bad.join(", ")}`);
}

export function renderNotification(
  template: NotifyTemplate,
  locale: Locale,
  params: TemplateParams,
): { title: string; text: string } {
  if (!NOTIFY_TEMPLATES.includes(template)) throw new TemplateError(`沒有這個範本：${template}`);
  assertSafeParams(params);
  const t = createTranslator({
    locale,
    messages: MESSAGES[locale],
    namespace: "providerTemplates",
  });
  const values = { caseId: params.caseId, time: params.time ?? "" };
  return { title: t(`${template}.title`, values), text: t(`${template}.text`, values) };
}

export function renderVerificationCode(locale: Locale, code: string): string {
  const t = createTranslator({
    locale,
    messages: MESSAGES[locale],
    namespace: "providerTemplates",
  });
  return t("verificationCode.text", { code });
}
