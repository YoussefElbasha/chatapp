import { getEmailFrom, getResend, isDevEmailLog } from './client'
import { passwordChangedEmailTemplate, passwordResetEmailTemplate, verificationEmailTemplate } from './templates'

const send = async (to: string, subject: string, html: string, link = ''): Promise<void> => {
  if (isDevEmailLog()) {
    console.log(`[email-dev] to=${to} subject="${subject}" link=${link}`)
    return
  }

  const { error } = await getResend().emails.send({
    from: getEmailFrom(),
    to,
    subject,
    html,
  })

  if (error) throw new Error(`Resend send failed: ${error.message}`)
}

export const sendVerificationEmail = async (to: string, link: string): Promise<void> => {
  const { subject, html } = verificationEmailTemplate(link)
  await send(to, subject, html, link)
}

export const sendPasswordResetEmail = async (to: string, link: string): Promise<void> => {
  const { subject, html } = passwordResetEmailTemplate(link)
  await send(to, subject, html, link)
}

export const sendPasswordChangedEmail = async (to: string): Promise<void> => {
  const { subject, html } = passwordChangedEmailTemplate()
  await send(to, subject, html)
}
