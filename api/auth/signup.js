import { sql } from '../_db.js'
import {
  hashPassword, signSession, buildSessionCookie,
  normalizeEmail, validateEmail, validatePassword,
} from '../_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const email = normalizeEmail(req.body?.email)
  const password = req.body?.password || ''

  const emailError = validateEmail(email)
  if (emailError) return res.status(400).json({ error: emailError })

  const passwordError = validatePassword(password)
  if (passwordError) return res.status(400).json({ error: passwordError })

  const existing = await sql`SELECT id FROM users WHERE email = ${email}`
  if (existing.length > 0) {
    return res.status(409).json({ error: 'An account with this email already exists' })
  }

  const passwordHash = await hashPassword(password)
  const [user] = await sql`
    INSERT INTO users (email, password_hash) VALUES (${email}, ${passwordHash})
    RETURNING id, email
  `

  const token = await signSession(user.id)
  res.setHeader('Set-Cookie', buildSessionCookie(token, req))
  return res.status(201).json({ user: { id: user.id, email: user.email } })
}
