import { z } from 'zod'

export const registerSchema = z.object({
  email: z.email('Invalid email format'),

  username: z
    .string({ error: 'Username is required' })
    .trim()
    .min(2, 'Username must be at least 2 characters')
    .max(32, 'Username must be at most 32 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores'),

  password: z
    .string({ error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters') // bcrypt hard limit
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),

  displayName: z
    .string()
    .trim()
    .min(1, 'Display name cannot be empty')
    .max(32, 'Display name must be at most 32 characters')
    .optional(),
})

export type RegisterDto = z.infer<typeof registerSchema>
