const baseStyle = `font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.5; color: #1a1a1a;`

const buttonStyle = `display: inline-block; padding: 12px 24px; background: #5865f2; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;`

const wrap = (title: string, body: string): string => `
  <div style="${baseStyle} max-width: 560px; margin: 0 auto; padding: 32px 24px;">
    <h1 style="font-size: 20px; margin: 0 0 16px;">${title}</h1>
    ${body}
    <p style="font-size: 12px; color: #6b7280; margin-top: 32px;">If you didn't request this, you can safely ignore this email.</p>
  </div>
`

export const verificationEmailTemplate = (link: string): { subject: string; html: string } => ({
  subject: 'Verify your email',
  html: wrap(
    'Confirm your email address',
    `
    <p>Tap the button below to confirm this email address. The link expires in 24 hours.</p>
    <p style="margin: 24px 0;"><a href="${link}" style="${buttonStyle}">Verify email</a></p>
    <p style="font-size: 12px; color: #6b7280;">Or paste this URL into your browser:<br/><span style="word-break: break-all;">${link}</span></p>
    `,
  ),
})

export const passwordResetEmailTemplate = (link: string): { subject: string; html: string } => ({
  subject: 'Reset your password',
  html: wrap(
    'Reset your password',
    `
    <p>Tap the button below to choose a new password. The link expires in 1 hour.</p>
    <p style="margin: 24px 0;"><a href="${link}" style="${buttonStyle}">Reset password</a></p>
    <p style="font-size: 12px; color: #6b7280;">Or paste this URL into your browser:<br/><span style="word-break: break-all;">${link}</span></p>
    `,
  ),
})
