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

  const systemPrompt = 'You are a helpful cooking assistant. Given a list of available ingredients, suggest recipes that can be made using ONLY those ingredients — do not invent or include any ingredient that is not explicitly in the provided list, including common staples like salt, pepper, oil, or water, unless they appear in the list. Respond ONLY with valid JSON in this exact shape, with no other text: {"recipes": [{"name": string, "description": string, "ingredientsUsed": string[], "steps": string[], "cookingTime": string}]}. "ingredientsUsed" must be a subset of the provided ingredient list. "steps" should be the ordered cooking instructions, one instruction per array entry. "cookingTime" should be a short human-readable estimate, e.g. "25 minutes". Suggest 3 to 5 recipes.'
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
    let detail = null
    try {
      const errorBody = await upstreamResponse.json()
      // Most providers return a bare {"error": {"message": ...}} object, but
      // Gemini's OpenAI-compatible endpoint wraps it in an array: [{"error": {...}}].
      const errorObj = Array.isArray(errorBody) ? errorBody[0] : errorBody
      detail = errorObj?.error?.message || errorObj?.message || null
    } catch {
      // upstream didn't return JSON — fall back to just the status
    }
    const suffix = detail ? `: ${detail.slice(0, 200)}` : '.'
    return res.status(502).json({ error: `Your AI provider returned an error (${upstreamResponse.status})${suffix}` })
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

  // Safety net: the model can still hallucinate an ingredient outside the
  // provided list despite the prompt instruction, so filter it back down
  // to only what's actually in the pantry and checked.
  const checkedNames = new Set(ingredientNames.map(n => n.toLowerCase()))
  const recipes = parsed.recipes.map(recipe => ({
    ...recipe,
    ingredientsUsed: Array.isArray(recipe.ingredientsUsed)
      ? recipe.ingredientsUsed.filter(ing => checkedNames.has(String(ing).trim().toLowerCase()))
      : [],
  }))

  return res.status(200).json({ recipes })
}
