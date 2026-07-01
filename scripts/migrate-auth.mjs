import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.miko_DATABASE_URL)

async function main() {
  console.log('Creating users table...')
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `

  console.log('Creating password_reset_tokens table...')
  await sql`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash)`

  console.log('Adding nullable user_id columns to categories/ingredients/recipes...')
  await sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`
  await sql`ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`
  await sql`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`

  console.log('Done. Existing rows have NULL user_id until claimed via scripts/claim-existing-data.mjs.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
