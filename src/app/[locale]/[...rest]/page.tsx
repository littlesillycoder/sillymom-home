import { notFound } from "next/navigation";

// 這一頁只負責顯示 404，不需要驗證快速顯示（否則開發模式會出現 instant 驗證提示）。
export const instant = false;

// 語言底下不存在的網址，顯示該語言的 404。
export default function CatchAll() {
  notFound();
}
