import 'dotenv/config'

import { defineConfig } from 'drizzle-kit'

// drizzle-kit loads this file on its own, outside the app's module graph, so it
// reads the variable directly rather than going through src/config/env.
const url = process.env.DATABASE_URL

if (!url) throw new Error('DATABASE_URL is not defined')

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/*.ts',
  out: './drizzle',
  dbCredentials: { url },
  casing: 'snake_case',
})
