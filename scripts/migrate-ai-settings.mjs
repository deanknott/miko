import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.miko_DATABASE_URL)

async function main() {
  console.log('Adding AI provider settings columns to users...')
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_endpoint_url TEXT`
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_model TEXT`
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_api_key_encrypted TEXT`
  console.log('Done.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
