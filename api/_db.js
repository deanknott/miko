import { neon } from '@neondatabase/serverless'

export const sql = neon(process.env.miko_DATABASE_URL)

export function json(res, status, body) {
  res.status(status).json(body)
}
