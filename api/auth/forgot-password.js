import { sql } from '../_db.js'
import { generateResetToken, normalizeEmail } from '../_auth.js'
import { sendPasswordResetEmail } from '../_email.js'

const GENERIC_RESPONSE = { ok: true, message: 'If an account exists for that email, a reset link has been sent.' }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const email = normalizeEmail(req.body?.email)
  if (!email) return res.status(200).json(GENERIC_RESPONSE)

  const [user] = await sql`SELECT id FROM users WHERE email = ${email}`
  if (!user) return res.status(200).json(GENERIC_RESPONSE)

  const { rawToken, tokenHash } = generateResetToken()
  await sql`
    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
    VALUES (${user.id}, ${tokenHash}, now() + interval '1 hour')
  `

  const host = req.headers.host
  const proto = req.headers['x-forwarded-proto'] || (host?.includes('localhost') ? 'http' : 'https')
  const resetUrl = `${proto}://${host}/?resetToken=${rawToken}`

  try {
    await sendPasswordResetEmail(email, resetUrl)
  } catch (err) {
    console.error('Failed to send password reset email:', err)
  }

  return res.status(200).json(GENERIC_RESPONSE)
}
