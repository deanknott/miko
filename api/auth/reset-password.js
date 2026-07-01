import { sql } from '../_db.js'
import { hashResetToken, hashPassword, validatePassword, signSession, buildSessionCookie } from '../_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { token, newPassword } = req.body || {}
  if (!token) return res.status(400).json({ error: 'Reset token is required' })

  const passwordError = validatePassword(newPassword)
  if (passwordError) return res.status(400).json({ error: passwordError })

  const tokenHash = hashResetToken(token)
  const [resetToken] = await sql`
    SELECT id, user_id AS "userId" FROM password_reset_tokens
    WHERE token_hash = ${tokenHash} AND used_at IS NULL AND expires_at > now()
  `
  if (!resetToken) return res.status(400).json({ error: 'This reset link is invalid or has expired' })

  const passwordHash = await hashPassword(newPassword)
  await sql`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${resetToken.userId}`
  await sql`UPDATE password_reset_tokens SET used_at = now() WHERE id = ${resetToken.id}`

  const [user] = await sql`SELECT id, email FROM users WHERE id = ${resetToken.userId}`

  const sessionToken = await signSession(user.id)
  res.setHeader('Set-Cookie', buildSessionCookie(sessionToken, req))
  return res.status(200).json({ user: { id: user.id, email: user.email } })
}
