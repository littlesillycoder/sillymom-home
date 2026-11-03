// 讀 `supabase status -o json` 的輸出（stdin），印出測試用的環境變數（給 GitHub Actions 的 $GITHUB_ENV）。
// 不同版本的 Supabase CLI 欄位名稱不同，所以每個值列出幾個可能的名稱。
import { readFileSync } from "node:fs";

const status = JSON.parse(readFileSync(0, "utf8"));
const pick = (...names) => {
  for (const name of names) if (status[name]) return status[name];
  throw new Error(
    `supabase status 找不到 ${names.join(" / ")}；目前有：${Object.keys(status).join(", ")}`,
  );
};

const lines = [
  `SUPABASE_TEST_URL=${pick("API_URL", "api_url")}`,
  `SUPABASE_TEST_PUBLISHABLE_KEY=${pick("PUBLISHABLE_KEY", "ANON_KEY", "anon_key")}`,
  `SUPABASE_TEST_SECRET_KEY=${pick("SECRET_KEY", "SERVICE_ROLE_KEY", "service_role_key")}`,
];
process.stdout.write(lines.join("\n") + "\n");
