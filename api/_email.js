import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function sendPasswordResetEmail(toEmail, resetUrl) {
  await transporter.sendMail({
    from: `Miko <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Reset your Miko password',
    html: `
      <p>Someone requested a password reset for your Miko account.</p>
      <p><a href="${resetUrl}">Click here to set a new password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
    `,
  })
}
