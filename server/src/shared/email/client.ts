import { Resend } from 'resend'

let client: Resend | undefined

export const isDevEmailLog = (): boolean => process.env.EMAIL_DEV_LOG === 'true'

export const getResend = (): Resend => {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) throw new Error('RESEND_API_KEY is not defined')
    client = new Resend(apiKey)
  }
  return client
}

export const getEmailFrom = (): string => {
  const from = process.env.EMAIL_FROM
  if (!from) throw new Error('EMAIL_FROM is not defined')
  return from
}

export const getAppUrl = (): string => {
  const url = process.env.APP_URL
  if (!url) throw new Error('APP_URL is not defined')
  return url
}
