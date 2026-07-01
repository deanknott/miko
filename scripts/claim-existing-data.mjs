import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.miko_DATABASE_URL)

async function main() {
  const email = (process.argv[2] || '').trim().toLowerCase()
  if (!email) {
    console.error('Usage: node --env-file=.env.local scripts/claim-existing-data.mjs <email>')
    console.error('Sign up for a real account through the app first, then run this with that email.')
    process.exit(1)
  }

  const [user] = await sql`SELECT id FROM users WHERE email = ${email}`
  if (!user) {
    console.error(`No user found with email "${email}". Sign up through the app first.`)
    process.exit(1)
  }

  console.log(`Claiming existing data for user id ${user.id} (${email})...`)

  const categoriesResult = await sql`UPDATE categories SET user_id = ${user.id} WHERE user_id IS NULL RETURNING id`
  const ingredientsResult = await sql`UPDATE ingredients SET user_id = ${user.id} WHERE user_id IS NULL RETURNING name`
  const recipesResult = await sql`UPDATE recipes SET user_id = ${user.id} WHERE user_id IS NULL RETURNING id`
  console.log(`Backfilled ${categoriesResult.length} categories, ${ingredientsResult.length} ingredients, ${recipesResult.length} recipes.`)

  console.log('Enforcing NOT NULL on user_id columns...')
  await sql`ALTER TABLE categories ALTER COLUMN user_id SET NOT NULL`
  await sql`ALTER TABLE ingredients ALTER COLUMN user_id SET NOT NULL`
  await sql`ALTER TABLE recipes ALTER COLUMN user_id SET NOT NULL`

  console.log('Fixing uniqueness constraints for per-user scoping...')
  await sql`ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key`
  await sql`ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_user_id_name_key`
  await sql`ALTER TABLE categories ADD CONSTRAINT categories_user_id_name_key UNIQUE (user_id, name)`

  await sql`ALTER TABLE ingredients DROP CONSTRAINT IF EXISTS ingredients_pkey`
  await sql`ALTER TABLE ingredients ADD CONSTRAINT ingredients_pkey PRIMARY KEY (user_id, name)`

  console.log('Adding supporting indexes...')
  await sql`CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id)`

  const [{ count: ingredientCount }] = await sql`SELECT COUNT(*)::int AS count FROM ingredients WHERE user_id = ${user.id}`
  const [{ count: recipeCount }] = await sql`SELECT COUNT(*)::int AS count FROM recipes WHERE user_id = ${user.id}`
  console.log(`Done. User ${email} now owns ${ingredientCount} ingredients and ${recipeCount} recipes.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
