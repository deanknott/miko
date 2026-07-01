import { sql } from '../_db.js'
import { verifyPassword, signSession, buildSessionCookie, normalizeEmail } from '../_auth.js'

const INVALID_CREDENTIALS = { error: 'Invalid email or password' }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const email = normalizeEmail(req.body?.email)
  const password = req.body?.password || ''
  if (!email || !password) return res.status(401).json(INVALID_CREDENTIALS)

  const [user] = await sql`SELECT id, email, password_hash FROM users WHERE email = ${email}`
  if (!user) return res.status(401).json(INVALID_CREDENTIALS)

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) return res.status(401).json(INVALID_CREDENTIALS)

  const token = await signSession(user.id)
  res.setHeader('Set-Cookie', buildSessionCookie(token, req))
  return res.status(200).json({ user: { id: user.id, email: user.email } })
}
