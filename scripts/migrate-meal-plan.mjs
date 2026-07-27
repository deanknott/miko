import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.miko_DATABASE_URL)

async function main() {
  console.log('Creating meal_plan_entries table...')
  await sql`
    CREATE TABLE IF NOT EXISTS meal_plan_entries (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day_of_week TEXT NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
      recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_meal_plan_entries_user_id ON meal_plan_entries(user_id)`
  console.log('Done.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
