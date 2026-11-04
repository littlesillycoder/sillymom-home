/** 頁首、選單顯示的使用者資料。資安：只放稱呼和狀態文字，不放手機號碼等個資。 */
export type HeaderUser = {
  /** 稱呼，例如「林小姐」；頭像顯示第一個字 */
  displayName: string;
  /** 選單資料卡的狀態文字（已翻譯），例如「手機已驗證 · LINE 已綁定」 */
  statusText?: string;
};

export type HeaderVariant = "guest" | "member" | "tech";

export type MemberNavKey = "dashboard" | "technicians" | "records" | "myHome";
export type TechNavKey = "home" | "schedule" | "earnings" | "profile";
