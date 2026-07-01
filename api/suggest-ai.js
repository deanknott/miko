import { sql } from './_db.js'
import { requireAuth } from './_auth.js'
import { decryptSecret } from './_crypto.js'

function extractJson(text) {
  const trimmed = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  return JSON.parse(trimmed)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await requireAuth(req, res)
  if (!session) return

  const [[user], ingredientRows] = await Promise.all([
    sql`
      SELECT ai_endpoint_url AS "aiEndpointUrl", ai_model AS "aiModel", ai_api_key_encrypted AS "aiApiKeyEncrypted"
      FROM users WHERE id = ${session.userId}
    `,
    sql`SELECT name FROM ingredients WHERE user_id = ${session.userId} AND checked = true ORDER BY name`,
  ])

  if (!user?.aiEndpointUrl || !user?.aiModel || !user?.aiApiKeyEncrypted) {
    return res.status(400).json({ error: 'Configure your AI provider in Settings first.' })
  }

  const ingredientNames = ingredientRows.map(r => r.name)
  if (ingredientNames.length === 0) {
    return res.status(400).json({ error: 'Check off some ingredients on the Ingredients page first.' })
  }

  const apiKey = decryptSecret(user.aiApiKeyEncrypted)

  const systemPrompt = 'You are a helpful cooking assistant. Given a list of available ingredients, suggest recipes that can be made using some or all of them. Respond ONLY with valid JSON in this exact shape, with no other text: {"recipes": [{"name": string, "description": string, "ingredientsUsed": string[]}]}. Suggest 3 to 5 recipes.'
  const userPrompt = `Available ingredients: ${ingredientNames.join(', ')}.`

  let upstreamResponse
  try {
    upstreamResponse = await fetch(`${user.aiEndpointUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: user.aiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(45000),
    })
  } catch (err) {
    return res.status(502).json({ error: `Couldn't reach your AI endpoint: ${err.message}` })
  }

  if (!upstreamResponse.ok) {
    return res.status(502).json({ error: `Your AI provider returned an error (${upstreamResponse.status}).` })
  }

  const data = await upstreamResponse.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) {
    return res.status(502).json({ error: "Your AI provider's response didn't include any content." })
  }

  let parsed
  try {
    parsed = extractJson(content)
  } catch {
    return res.status(502).json({ error: "Couldn't parse a response from your AI provider. Try again, or check your model/endpoint settings." })
  }

  if (!Array.isArray(parsed?.recipes)) {
    return res.status(502).json({ error: "Your AI provider's response wasn't in the expected format." })
  }

  return res.status(200).json({ recipes: parsed.recipes })
}
