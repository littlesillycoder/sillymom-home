// 沒有語言的網址找不到時（少見：大部分網址都會先轉到 /zh-TW/...）。
export default function RootNotFound() {
  return (
    <html lang="zh-Hant-TW">
      <body>
        <main>
          <h1>404</h1>
        </main>
      </body>
    </html>
  );
}
