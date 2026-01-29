import js from "@eslint/js"
import eslintPluginBetterTailwindcss from "eslint-plugin-better-tailwindcss"
import importPlugin from "eslint-plugin-import"
import prettier from "eslint-plugin-prettier"
import react from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import { defineConfig, globalIgnores } from "eslint/config"
import globals from "globals"
import tseslint from "typescript-eslint"

export default defineConfig([
  globalIgnores(["dist"]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "better-tailwindcss": eslintPluginBetterTailwindcss,
      import: importPlugin,
      prettier,
      // "@tanstack/query": tanstackQuery,
      // "@tanstack/router": tanstackRouter,
    },
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        project: ["./tsconfig.app.json", "./tsconfig.node.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      react: { version: "detect" },
      "import/resolver": {
        typescript: {
          project: "./tsconfig.app.json",
        },
      },
      "better-tailwindcss": {
        entryPoint: "src/global.css",
      },
    },

    rules: {
      // TypeScript
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": ["warn", { prefer: "type-imports" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",

      // React Rules
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules, // Add this for React 17+
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/jsx-uses-react": "off",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      // // TanStack Query
      // ...tanstackQuery.configs.recommended.rules,
      // "@tanstack/query/exhaustive-deps": "warn",

      // // TanStack Router
      // ...tanstackRouter.configs.recommended.rules,
      // "@tanstack/router/create-route-property-order": "off", // Disabled due to spread element support issues

      // Import Rules
      "import/order": "off",
      "import/no-unresolved": "off", // TypeScript handles this

      //  Tailwind CSS
      ...eslintPluginBetterTailwindcss.configs.recommended.rules,
      "better-tailwindcss/enforce-consistent-class-order": "off",

      // Code formatting
      "prettier/prettier": ["error", { endOfLine: "auto" }],

      // General code quality
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",
      "no-redeclare": "error",
      "no-undef": "error",
      "no-import-assign": "error",
    },
  },
  {
    ignores: ["node_modules", "dist", "build/", "public/", "vite.config.ts"],
  },
])
