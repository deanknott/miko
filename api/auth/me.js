import { sql } from '../_db.js'
import { requireAuth, buildClearCookie } from '../_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await requireAuth(req, res)
  if (!session) return

  const [user] = await sql`SELECT id, email FROM users WHERE id = ${session.userId}`
  if (!user) {
    res.setHeader('Set-Cookie', buildClearCookie(req))
    return res.status(401).json({ error: 'Not authenticated' })
  }

  return res.status(200).json({ user: { id: user.id, email: user.email } })
}
