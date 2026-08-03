import { z } from 'zod'

const emailField = z.email('Invalid email format').trim().toLowerCase()

const passwordField = z
  .string({ error: 'Password is required' })
  .min(12, 'Password must be at least 12 characters')
  .refine((p) => Buffer.byteLength(p, 'utf8') <= 72, 'Password must be at most 72 bytes')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character')

export const registerSchema = z.object({
  email: emailField,

  username: z
    .string({ error: 'Username is required' })
    .trim()
    .min(2, 'Username must be at least 2 characters')
    .max(32, 'Username must be at most 32 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores'),

  password: passwordField,

  displayName: z
    .string()
    .trim()
    .min(1, 'Display name cannot be empty')
    .max(32, 'Display name must be at most 32 characters')
    .optional(),
})

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
})

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordField,
  })
  .refine((d) => d.oldPassword !== d.newPassword, {
    message: 'New password must be different from the current password',
    path: ['newPassword'],
  })

export const forgotPasswordSchema = z.object({ email: emailField })
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: passwordField,
})

export const verifyEmailSchema = z.object({ token: z.string().min(1, 'Token is required') })
export const resendVerificationSchema = z.object({ email: emailField })

export type VerifyEmailDto = z.infer<typeof verifyEmailSchema>
export type ResendVerificationDto = z.infer<typeof resendVerificationSchema>
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>
export type LoginDto = z.infer<typeof loginSchema>
export type RegisterDto = z.infer<typeof registerSchema>
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>
