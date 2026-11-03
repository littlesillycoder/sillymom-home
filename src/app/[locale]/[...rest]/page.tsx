import { notFound } from "next/navigation";

// 語言底下不存在的網址，顯示該語言的 404。
export default function CatchAll() {
  notFound();
}
