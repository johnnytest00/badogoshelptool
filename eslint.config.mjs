import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // .agent/.agents/.claude hold third-party assistant skills and tooling, not application code.
    ignores: [".next/**", "next-env.d.ts", "node_modules/**", "out/**", "coverage/**", ".agent/**", ".agents/**", ".claude/**"],
  },
);
