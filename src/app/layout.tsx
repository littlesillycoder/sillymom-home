import "./globals.css";

// 真正的 <html>、<body> 在 app/[locale]/layout.tsx（才知道語言）。
export default function RootLayout({ children }: LayoutProps<"/">) {
  return children;
}
