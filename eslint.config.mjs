import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import boundaries from "eslint-plugin-boundaries";

/**
 * 模組邊界規則（docs/架構說明.md、CLAUDE.md）：
 * 1. 模組只能 import 別的模組的 index.ts（公開介面），同一個模組內不限制。
 * 2. shared/ 不能 import 任何模組。
 * 3. app/（頁面、Route Handler）只能 import 模組的 index.ts 和 shared/。
 * 4. 資安：shared/supabase/admin.ts（略過 RLS 的連線）只有模組的 server/、
 *    shared/events/、shared/health/ 可以 import。
 */
const boundaryRules = {
  files: ["src/**/*.{ts,tsx}"],
  plugins: { boundaries },
  settings: {
    "import/resolver": { typescript: { alwaysTryTypes: true } },
    "boundaries/elements": [
      { type: "module", pattern: "src/modules/*", capture: ["name"], partialMatch: false },
      { type: "shared", pattern: "src/shared/*", capture: ["name"], partialMatch: false },
      { type: "app", pattern: "src/app", partialMatch: false },
      // src/ 最上層的檔案（例如 instrumentation.ts）當成 app 層。放最後，前面都沒對到才算。
      { type: "app", pattern: "src", partialMatch: false },
    ],
    "boundaries/files": [
      { pattern: "src/modules/*/index.ts", category: "module-public" },
      { pattern: "src/modules/*/server/**", category: "module-server" },
      { pattern: "src/shared/supabase/admin.ts", category: "admin-client" },
      { pattern: "src/shared/events/**", category: "admin-allowed" },
      { pattern: "src/shared/health/**", category: "admin-allowed" },
    ],
  },
  rules: {
    "boundaries/dependencies": [
      2,
      {
        default: "disallow",
        policies: [
          {
            from: { element: { type: "module" } },
            allow: {
              to: {
                element: { type: "module", captured: { name: "{{ from.element.captured.name }}" } },
              },
            },
          },
          {
            from: { element: { types: ["module", "app"] } },
            allow: { to: { file: { categories: "module-public" } } },
          },
          {
            from: { element: { types: ["module", "shared", "app"] } },
            allow: { to: { element: { type: "shared" } } },
          },
          {
            from: { element: { type: "app" } },
            allow: { to: { element: { type: "app" } } },
          },
          {
            disallow: { to: { file: { categories: "admin-client" } } },
            message:
              "資安：shared/supabase/admin.ts 會略過 RLS，只有模組的 server/、shared/events/、shared/health/ 可以 import",
          },
          {
            from: { file: { categories: ["module-server", "admin-allowed"] } },
            allow: { to: { file: { categories: "admin-client" } } },
          },
        ],
      },
    ],
  },
};

/**
 * 多語系與 XSS：
 * - .tsx 裡不能直接寫中文（含全形標點），畫面文字要放語言檔 src/shared/i18n/messages/。
 *   註解不受影響；真的需要時用 // eslint-disable-next-line no-restricted-syntax 並寫原因。
 * - 禁止 dangerouslySetInnerHTML；需要粗體、連結的文字用 next-intl 的 t.rich()。
 */
const CJK = "[\\u3000-\\u303f\\u3400-\\u9fff\\uf900-\\ufaff\\uff00-\\uffef]";
const NO_CJK_MESSAGE = "畫面文字要放在語言檔（src/shared/i18n/messages/），不能直接寫中文";
const i18nRules = {
  files: ["src/**/*.tsx"],
  ignores: ["src/**/*.test.tsx"],
  rules: {
    "no-restricted-syntax": [
      "error",
      { selector: `JSXText[value=/${CJK}/]`, message: NO_CJK_MESSAGE },
      { selector: `Literal[value=/${CJK}/]`, message: NO_CJK_MESSAGE },
      { selector: `TemplateElement[value.raw=/${CJK}/]`, message: NO_CJK_MESSAGE },
    ],
    "react/no-danger": "error",
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  boundaryRules,
  i18nRules,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "supabase/.temp/**",
  ]),
]);

export default eslintConfig;
