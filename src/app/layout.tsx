import type { Metadata } from "next";
import "./globals.css";

// 網站名稱和語言會在「多語系、幣別、時區、日期格式」issue 改成從語言檔讀取。
export const metadata: Metadata = {
  title: "傻媽萬事通",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant-TW">
      <body>{children}</body>
    </html>
  );
}
