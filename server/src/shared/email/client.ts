import { env } from 'config/env'
import { Resend } from 'resend'

let client: Resend | undefined

export const isDevEmailLog = (): boolean => env.EMAIL_DEV_LOG

export const getResend = (): Resend => {
  if (!client) {
    client = new Resend(env.RESEND_API_KEY)
  }
  return client
}

export const getEmailFrom = (): string => env.EMAIL_FROM

export const getAppUrl = (): string => env.APP_URL
