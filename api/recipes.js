import { sql } from './_db.js'
import { requireAuth } from './_auth.js'

// Ensures every ingredient a recipe references exists in the user's pantry,
// so recipes can freely use ingredients that haven't been added there yet.
// New ones are created unchecked; existing ingredients (checked or not) are left alone.
async function ensurePantryIngredients(userId, ings) {
  const newIngredients = []
  for (const ing of ings) {
    const rows = await sql`
      INSERT INTO ingredients (name, checked, category_id, user_id)
      VALUES (${ing.name}, false, NULL, ${userId})
      ON CONFLICT (user_id, name) DO NOTHING
      RETURNING name, checked, category_id AS "categoryId"
    `
    if (rows.length > 0) newIngredients.push(rows[0])
  }
  return newIngredients
}

export default async function handler(req, res) {
  const session = await requireAuth(req, res)
  if (!session) return

  if (req.method === 'POST') {
    const name = (req.body?.name || '').trim()
    const ings = Array.isArray(req.body?.ings) ? req.body.ings : []
    if (!name || ings.length === 0) return res.status(400).json({ error: 'name and ings are required' })
    const [{ id }] = await sql`
      INSERT INTO recipes (name, user_id) VALUES (${name}, ${session.userId}) RETURNING id
    `
    for (const ing of ings) {
      await sql`
        INSERT INTO recipe_ingredients (recipe_id, name, essential)
        VALUES (${id}, ${ing.name}, ${!!ing.essential})
      `
    }
    const newIngredients = await ensurePantryIngredients(session.userId, ings)
    return res.status(201).json({ id, name, ings, newIngredients })
  }

  if (req.method === 'PATCH') {
    const { id, ings } = req.body || {}
    if (!id || !Array.isArray(ings)) return res.status(400).json({ error: 'id and ings are required' })
    const [recipe] = await sql`SELECT id FROM recipes WHERE id = ${id} AND user_id = ${session.userId}`
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' })
    await sql`DELETE FROM recipe_ingredients WHERE recipe_id = ${id}`
    for (const ing of ings) {
      await sql`
        INSERT INTO recipe_ingredients (recipe_id, name, essential)
        VALUES (${id}, ${ing.name}, ${!!ing.essential})
      `
    }
    const newIngredients = await ensurePantryIngredients(session.userId, ings)
    return res.status(200).json({ ok: true, newIngredients })
  }

  if (req.method === 'DELETE') {
    const id = req.query?.id
    if (!id) return res.status(400).json({ error: 'id is required' })
    await sql`DELETE FROM recipes WHERE id = ${id} AND user_id = ${session.userId}`
    return res.status(200).json({ ok: true })
  }

  res.setHeader('Allow', 'POST, PATCH, DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}
