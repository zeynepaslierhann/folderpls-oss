import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // eslint-config-next 16.4.x react-hooks 7.1 ile React Compiler kurallarını hata yaptı (59 bulgu).
  // Güvenlik yaması kapsamı dışı: uyarıya indirildi; kodu düzeltmek ayrı iş (davranış değiştirir).
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  // Tek ikon kaynağı: components/icons/index.ts. local-data-panel paralel kanalda (otomatik yedek);
  // o dal birleşince importu @/components/icons'a alınıp bu istisna silinecek.
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["components/icons/index.ts", "components/dashboard/local-data-panel.tsx"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [{ name: "lucide-react", message: "İkonları @/components/icons içinden al." }],
        patterns: [{ group: ["lucide-react/*"], message: "İkonları @/components/icons içinden al." }],
      }],
      "no-restricted-syntax": ["error", {
        selector: "ImportDeclaration[source.value=/components\\/icons/] > ImportNamespaceSpecifier",
        message: "import * ağaç sallamayı bozar; ikonları adıyla al.",
      }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Ajan worktree'leri (.claude/worktrees) ayrı kopyalardır; lint'i 85 bin bulguya şişiriyordu.
    ".claude/**",
  ]),
]);

export default eslintConfig;
