import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import security from "eslint-plugin-security";
import nodePlugin from "eslint-plugin-n";
import simpleImportSort from "eslint-plugin-simple-import-sort";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "coverage"] },

  // 1. Base JavaScript Rules
  js.configs.recommended,

  // 2. Node.js Specific Best Practices (Files, Imports, etc.)
  nodePlugin.configs["flat/recommended-script"],

  // 3. Security Vulnerability Checks
  security.configs.recommended,

  // 4. Strict TypeScript Rules (Type-Checked)
  // This replaces the basic 'recommended' with 'strict-type-checked'
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
      parserOptions: {
        // ESSENTIAL for Type-Checked rules: tells ESLint where your types are
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      // --- Professional Overrides ---

      // Force standard Console logging to warn (allow generic 'error'/'info')
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],

      // Enforce proper Error handling in Promises
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",

      // Enforce Clean Imports (Auto-sorts imports)
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",

      // Node.js specific: Ensure imports actually resolve (helps with module resolution issues)
      "n/no-missing-import": "off", // TypeScript handles this usually, so we turn off the ESLint version if it conflicts
      
      // Allow unused vars if they start with _ (standard convention)
      "@typescript-eslint/no-unused-vars": [
        "error",
        { 
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_"
        }
      ],
      
      // Enforce using 'type' for type imports (cleaner transpilation)
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports" }
      ],
      
      // Disable some overly strict stylistic rules if they are annoying
      "@typescript-eslint/prefer-nullish-coalescing": "warn", // Warns to use ?? instead of ||
    },
  }
);