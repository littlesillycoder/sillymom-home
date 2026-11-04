/**
 * 師傅卡用的資料。卡片只顯示這些欄位。
 * 資安：只有稱呼（例如「林師傅」）和頭像字，不放全名、手機號碼等個資。
 */
export type TechGender = "female" | "male";

/** 證件只接受固定種類，文字從語言檔來。 */
export const CREDENTIALS = ["identity", "policeRecord", "license"] as const;
export type Credential = (typeof CREDENTIALS)[number];

export const LANGUAGES = ["mandarin", "taiwanese", "hakka", "english"] as const;
export type TechLanguage = (typeof LANGUAGES)[number];

/** 狀態：在線中、視訊中、稍後可視訊（at：可以視訊的時間，UTC ISO 字串）。 */
export type TechStatus = { kind: "online" } | { kind: "inCall" } | { kind: "later"; at: string };

export type TechCardData = {
  /** 師傅 UUID（連到個人頁） */
  id: string;
  /** 稱呼，例如「林師傅」 */
  displayName: string;
  gender: TechGender;
  /** 評分（0–5，一位小數）；還沒有評價時為 null */
  rating: number | null;
  reviewCount: number;
  serviceCount: number;
  /** 專長，例如「冷氣安裝、保養、漏水排除」 */
  specialties: string;
  /** 證照摘要：主要證照、年資、其他證照數 */
  license?: { name: string; years: number; otherCount: number };
  credentials: Credential[];
  languages: TechLanguage[];
  status: TechStatus;
  /** 平均回應分鐘數 */
  responseMinutes: number;
  /** 剛剛和這位師傅視訊過（顯示黃色標籤） */
  recentlyCalled?: boolean;
  /** 合作過的次數（我信任的師傅） */
  collaborationCount?: number;
};
