import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const MIN_SECRET_LENGTH = 32

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    PORT: z.coerce.number().int().positive().default(5000),

    DATABASE_URL: z.string().min(1, 'required'),

    JWT_ACCESS_SECRET: z.string().min(MIN_SECRET_LENGTH, `must be at least ${MIN_SECRET_LENGTH} characters`),
    JWT_REFRESH_SECRET: z.string().min(MIN_SECRET_LENGTH, `must be at least ${MIN_SECRET_LENGTH} characters`),

    APP_URL: z.url('must be a full URL, e.g. https://app.example.com'),

    EMAIL_FROM: z.string().min(1, 'required'),
    RESEND_API_KEY: z.string().min(1).optional(),

    EMAIL_DEV_LOG: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),

    /**
     * How many proxies (nginx, Render, Fly, Cloudflare...) sit in front of us.
     * 0 means none. Getting this wrong breaks every rate limiter — see index.ts.
     */
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),

    CORS_ORIGINS: z.string().default(''),

    /**
     * How chatty the logs are. 'info' is a good default, 'debug' for digging,
     * 'silent' turns logging off entirely (used by the test suite).
     */
    LOG_LEVEL: z.enum(['silent', 'fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  })
  .superRefine((env, ctx) => {
    if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_REFRESH_SECRET'],
        message: 'must be different from JWT_ACCESS_SECRET',
      })
    }

    if (!env.EMAIL_DEV_LOG && !env.RESEND_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['RESEND_API_KEY'],
        message: 'required unless EMAIL_DEV_LOG=true',
      })
    }

    if (env.NODE_ENV === 'production' && !env.CORS_ORIGINS.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['CORS_ORIGINS'],
        message: 'required in production',
      })
    }
  })

const blanksAsMissing = (source: NodeJS.ProcessEnv): Record<string, string | undefined> =>
  Object.fromEntries(Object.entries(source).map(([key, value]) => [key, value?.trim() ? value : undefined]))

const parsed = envSchema.safeParse(blanksAsMissing(process.env))

if (!parsed.success) {
  const problems = parsed.error.issues.map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)

  console.error(`Invalid environment configuration:\n${problems.join('\n')}`)

  // Exiting beats throwing here: a bad config is not recoverable, and a stack
  // trace would bury the list of missing keys the reader actually needs.
  // eslint-disable-next-line n/no-process-exit
  process.exit(1)
}

export const env = parsed.data

export const corsOrigins: string[] = env.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

export const isProduction = env.NODE_ENV === 'production'
