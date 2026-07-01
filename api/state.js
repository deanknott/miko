import { sql } from './_db.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const [ingredientRows, categoryRows, recipeRows, recipeIngredientRows] = await Promise.all([
    sql`SELECT name, checked, category_id AS "categoryId" FROM ingredients ORDER BY name`,
    sql`SELECT id, name FROM categories ORDER BY name`,
    sql`SELECT id, name FROM recipes ORDER BY id`,
    sql`SELECT recipe_id AS "recipeId", name, essential FROM recipe_ingredients`,
  ])

  const ingsByRecipe = new Map()
  for (const row of recipeIngredientRows) {
    if (!ingsByRecipe.has(row.recipeId)) ingsByRecipe.set(row.recipeId, [])
    ingsByRecipe.get(row.recipeId).push({ name: row.name, essential: row.essential })
  }

  const recipes = recipeRows.map(r => ({ id: r.id, name: r.name, ings: ingsByRecipe.get(r.id) || [] }))

  res.status(200).json({
    ingredients: ingredientRows,
    categories: categoryRows,
    recipes,
  })
}
