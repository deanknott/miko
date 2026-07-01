import { sql } from './_db.js'
import { requireAuth } from './_auth.js'
import { encryptSecret } from './_crypto.js'

export default async function handler(req, res) {
  const session = await requireAuth(req, res)
  if (!session) return

  if (req.method === 'GET') {
    const [user] = await sql`
      SELECT ai_endpoint_url AS "aiEndpointUrl", ai_model AS "aiModel", ai_api_key_encrypted AS "aiApiKeyEncrypted"
      FROM users WHERE id = ${session.userId}
    `
    return res.status(200).json({
      aiEndpointUrl: user?.aiEndpointUrl || '',
      aiModel: user?.aiModel || '',
      hasApiKey: Boolean(user?.aiApiKeyEncrypted),
    })
  }

  if (req.method === 'PATCH') {
    const { aiEndpointUrl, aiModel, aiApiKey } = req.body || {}

    if (aiEndpointUrl !== undefined) {
      const trimmed = aiEndpointUrl.trim().replace(/\/+$/, '')
      await sql`UPDATE users SET ai_endpoint_url = ${trimmed || null} WHERE id = ${session.userId}`
    }
    if (aiModel !== undefined) {
      await sql`UPDATE users SET ai_model = ${aiModel.trim() || null} WHERE id = ${session.userId}`
    }
    if (aiApiKey !== undefined) {
      const encrypted = aiApiKey ? encryptSecret(aiApiKey) : null
      await sql`UPDATE users SET ai_api_key_encrypted = ${encrypted} WHERE id = ${session.userId}`
    }

    return res.status(200).json({ ok: true })
  }

  res.setHeader('Allow', 'GET, PATCH')
  return res.status(405).json({ error: 'Method not allowed' })
}
