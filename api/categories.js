import { sql } from './_db.js'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const name = (req.body?.name || '').trim()
    if (!name) return res.status(400).json({ error: 'name is required' })
    const existing = await sql`SELECT id FROM categories WHERE LOWER(name) = LOWER(${name})`
    if (existing.length > 0) return res.status(409).json({ error: 'category already exists' })
    const rows = await sql`INSERT INTO categories (name) VALUES (${name}) RETURNING id, name`
    return res.status(201).json(rows[0])
  }

  if (req.method === 'PATCH') {
    const { id, name } = req.body || {}
    const trimmed = (name || '').trim()
    if (!id || !trimmed) return res.status(400).json({ error: 'id and name are required' })
    await sql`UPDATE categories SET name = ${trimmed} WHERE id = ${id}`
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    const id = req.query?.id
    if (!id) return res.status(400).json({ error: 'id is required' })
    await sql`UPDATE ingredients SET category_id = NULL WHERE category_id = ${id}`
    await sql`DELETE FROM categories WHERE id = ${id}`
    return res.status(200).json({ ok: true })
  }

  res.setHeader('Allow', 'POST, PATCH, DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}
