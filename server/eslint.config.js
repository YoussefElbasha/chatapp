import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'
import security from 'eslint-plugin-security'
import nodePlugin from 'eslint-plugin-n'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },

  // Applies to every file, TypeScript and JavaScript alike. Must match the Node
  // version we actually run: set it too low and rules reject modern built-ins
  // like import.meta.dirname that work perfectly well here.
  {
    settings: {
      node: { version: '>=22.16.0' },
    },
  },

  js.configs.recommended,
  nodePlugin.configs['flat/recommended-script'],
  security.configs.recommended,
  ...tseslint.configs.strictTypeChecked,

  // The config files themselves are plain JS, so the type-aware rules cannot
  // run on them — they would error out looking for a TypeScript program.
  {
    files: ['**/*.js'],
    ...tseslint.configs.disableTypeChecked,
  },

  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
      parserOptions: {
        // The default config is the wide one (src + tests + vitest.config.ts);
        // tsconfig.build.json is the narrow one. See tsconfig.json for why.
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',

      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',

      'n/no-missing-import': 'off',

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
    },
  },

  // Tests and build config are development-only, so importing devDependencies
  // is exactly right there — the rule that flags it is aimed at shipped code.
  {
    files: ['tests/**/*.ts', '*.config.ts', '*.config.js'],
    rules: {
      'n/no-unpublished-import': 'off',
    },
  },

  prettier,
)
