import { sql } from './_db.js'
import { requireAuth } from './_auth.js'

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

export default async function handler(req, res) {
  const session = await requireAuth(req, res)
  if (!session) return

  if (req.method === 'POST') {
    const { dayOfWeek, recipeId } = req.body || {}
    if (!DAYS_OF_WEEK.includes(dayOfWeek) || !recipeId) {
      return res.status(400).json({ error: 'dayOfWeek and recipeId are required' })
    }
    const [recipe] = await sql`SELECT id FROM recipes WHERE id = ${recipeId} AND user_id = ${session.userId}`
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' })
    const [entry] = await sql`
      INSERT INTO meal_plan_entries (user_id, day_of_week, recipe_id)
      VALUES (${session.userId}, ${dayOfWeek}, ${recipeId})
      RETURNING id, day_of_week AS "dayOfWeek", recipe_id AS "recipeId"
    `
    return res.status(201).json(entry)
  }

  if (req.method === 'DELETE') {
    const id = req.query?.id
    if (!id) return res.status(400).json({ error: 'id is required' })
    await sql`DELETE FROM meal_plan_entries WHERE id = ${id} AND user_id = ${session.userId}`
    return res.status(200).json({ ok: true })
  }

  res.setHeader('Allow', 'POST, DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}
