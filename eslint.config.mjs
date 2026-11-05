import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Vendor assets and agent tooling are not application source.
    ignores: [".next/**", "next-env.d.ts", "node_modules/**", "out/**", "coverage/**", "public/ocr/**", ".agent/**", ".agents/**", ".claude/**"],
  },
);
