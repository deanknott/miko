import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.miko_DATABASE_URL)

const DEFAULT_INGREDIENTS = [
  'eggs', 'butter', 'onion', 'garlic', 'pasta', 'pepper', 'mushroom',
  'cheese', 'halloumi', 'paneer', 'taco shells', 'mince',
  'waffles', 'beans', 'cous cous', 'curry sauce', 'chip shop curry sauce',
  'lasagna sheets', 'lasagna red sauce', 'lasagna white sauce', 'honey', 'parsnips',
  'carrots', 'seitan', 'bang bang', 'corn flour', 'crumbs', 'soy sauce', 'hoisin', 'xiou xing',
  'brown sugar', 'five spice', 'ginger', 'rice', 'wraps', 'fajita seasoning', 'cream cheese',
  'hot chilli sauce', 'mac and cheese', 'feta', 'pasta bake sauce', 'roasties', 'gravy',
  'enchilada kit',
]

const DEFAULT_RECIPES = [
  { name: 'Halloumi curry',      ings: [{ name: 'rice', essential: true }, { name: 'curry sauce', essential: true }, { name: 'halloumi', essential: false }, { name: 'onion', essential: false }, { name: 'pepper', essential: false }, { name: 'mushroom', essential: false }] },
  { name: 'Paneer curry',        ings: [{ name: 'rice', essential: true }, { name: 'curry sauce', essential: true }, { name: 'paneer', essential: false }, { name: 'onion', essential: false }, { name: 'pepper', essential: false }, { name: 'mushroom', essential: false }] },
  { name: 'Tacos',               ings: [{ name: 'taco shells', essential: true }, { name: 'mince', essential: true }, { name: 'hot chilli sauce', essential: false }, { name: 'mac and cheese', essential: false }, { name: 'onion', essential: false }, { name: 'pepper', essential: false }, { name: 'mushroom', essential: false }] },
  { name: 'Breakfast tea',       ings: [{ name: 'waffles', essential: true }, { name: 'eggs', essential: true }, { name: 'beans', essential: false }, { name: 'cheese', essential: false }] },
  { name: 'Halloumi cous cous',  ings: [{ name: 'cous cous', essential: true }, { name: 'halloumi', essential: true }, { name: 'mushroom', essential: false }, { name: 'pepper', essential: false }, { name: 'onion', essential: false }] },
  { name: 'Feta cous cous',      ings: [{ name: 'cous cous', essential: true }, { name: 'feta', essential: true }, { name: 'mushroom', essential: false }, { name: 'pepper', essential: false }, { name: 'onion', essential: false }] },
  { name: 'Pasta bake',          ings: [{ name: 'pasta', essential: true }, { name: 'pasta bake sauce', essential: true }, { name: 'cheese', essential: false }] },
  { name: 'Lasagna',             ings: [{ name: 'mince', essential: true }, { name: 'lasagna sheets', essential: true }, { name: 'lasagna red sauce', essential: true }, { name: 'lasagna white sauce', essential: true }, { name: 'cheese', essential: false }] },
  { name: 'Honey roast',         ings: [{ name: 'carrots', essential: true }, { name: 'parsnips', essential: true }, { name: 'honey', essential: true }, { name: 'roasties', essential: true }, { name: 'gravy', essential: true }, { name: 'onion', essential: false }, { name: 'pepper', essential: false }, { name: 'halloumi', essential: false }, { name: 'garlic', essential: false }] },
  { name: 'Bang bang',           ings: [{ name: 'bang bang', essential: true }, { name: 'seitan', essential: true }, { name: 'rice', essential: true }, { name: 'corn flour', essential: false }, { name: 'crumbs', essential: false }] },
  { name: 'BBQ sauce',           ings: [{ name: 'hoisin', essential: true }, { name: 'soy sauce', essential: true }, { name: 'xiou xing', essential: true }, { name: 'ginger', essential: false }, { name: 'honey', essential: false }, { name: 'brown sugar', essential: false }, { name: 'five spice', essential: false }, { name: 'garlic', essential: false }] },
  { name: 'Halloumi fried rice', ings: [{ name: 'rice', essential: true }, { name: 'eggs', essential: true }, { name: 'chip shop curry sauce', essential: true }, { name: 'halloumi', essential: false }, { name: 'mushroom', essential: false }, { name: 'pepper', essential: false }, { name: 'onion', essential: false }] },
  { name: 'Seitan fried rice',   ings: [{ name: 'rice', essential: true }, { name: 'eggs', essential: true }, { name: 'chip shop curry sauce', essential: true }, { name: 'seitan', essential: false }, { name: 'mushroom', essential: false }, { name: 'pepper', essential: false }, { name: 'onion', essential: false }] },
  { name: 'Enchiladas',          ings: [{ name: 'enchilada kit', essential: true }, { name: 'halloumi', essential: true }, { name: 'mushroom', essential: false }, { name: 'pepper', essential: false }, { name: 'onion', essential: false }] },
  { name: 'Seitan fajitas',      ings: [{ name: 'wraps', essential: true }, { name: 'seitan', essential: true }, { name: 'fajita seasoning', essential: true }, { name: 'mushroom', essential: false }, { name: 'pepper', essential: false }, { name: 'onion', essential: false }] },
  { name: 'Halloumi fajitas',    ings: [{ name: 'wraps', essential: true }, { name: 'halloumi', essential: true }, { name: 'fajita seasoning', essential: true }, { name: 'mushroom', essential: false }, { name: 'pepper', essential: false }, { name: 'onion', essential: false }] },
]

async function main() {
  console.log('Creating tables...')

  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS ingredients (
      name TEXT PRIMARY KEY,
      checked BOOLEAN NOT NULL DEFAULT true,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS recipes (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      essential BOOLEAN NOT NULL DEFAULT false,
      PRIMARY KEY (recipe_id, name)
    )
  `

  console.log('Tables ready.')

  const [{ count: ingredientCount }] = await sql`SELECT COUNT(*)::int AS count FROM ingredients`
  if (ingredientCount === 0) {
    console.log('Seeding default ingredients...')
    for (const name of DEFAULT_INGREDIENTS) {
      await sql`INSERT INTO ingredients (name, checked) VALUES (${name}, true) ON CONFLICT DO NOTHING`
    }
  } else {
    console.log(`Ingredients table already has ${ingredientCount} rows, skipping seed.`)
  }

  const [{ count: recipeCount }] = await sql`SELECT COUNT(*)::int AS count FROM recipes`
  if (recipeCount === 0) {
    console.log('Seeding default recipes...')
    for (const recipe of DEFAULT_RECIPES) {
      const [{ id }] = await sql`INSERT INTO recipes (name) VALUES (${recipe.name}) RETURNING id`
      for (const ing of recipe.ings) {
        await sql`
          INSERT INTO recipe_ingredients (recipe_id, name, essential)
          VALUES (${id}, ${ing.name}, ${ing.essential})
        `
      }
    }
  } else {
    console.log(`Recipes table already has ${recipeCount} rows, skipping seed.`)
  }

  console.log('Done.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
