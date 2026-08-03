import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

const srcDir = resolve(import.meta.dirname, 'src')

export default defineConfig({
  resolve: {
    // Mirrors tsconfig's `paths: { "*": ["./src/*"] }` so imports like
    // 'modules/auth/auth.service' resolve the same way they do at runtime.
    alias: [
      { find: /^(config|db|modules|shared)\//, replacement: `${srcDir}/$1/` },
      { find: /^app$/, replacement: `${srcDir}/app.ts` },
    ],
  },
  test: {
    globalSetup: ['./tests/global-setup.ts'],
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],

    // These tests share one database, so they must not run at the same time.
    fileParallelism: false,
    sequence: { concurrent: false },

    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
