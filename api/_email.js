import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendPasswordResetEmail(toEmail, resetUrl) {
  await resend.emails.send({
    from: 'Miko <onboarding@resend.dev>',
    to: toEmail,
    subject: 'Reset your Miko password',
    html: `
      <p>Someone requested a password reset for your Miko account.</p>
      <p><a href="${resetUrl}">Click here to set a new password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
    `,
  })
}
