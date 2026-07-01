import { sql } from './_db.js'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const name = (req.body?.name || '').trim().toLowerCase()
    if (!name) return res.status(400).json({ error: 'name is required' })
    const rows = await sql`
      INSERT INTO ingredients (name, checked, category_id)
      VALUES (${name}, true, NULL)
      ON CONFLICT (name) DO NOTHING
      RETURNING name, checked, category_id AS "categoryId"
    `
    if (rows.length === 0) return res.status(409).json({ error: 'ingredient already exists' })
    return res.status(201).json(rows[0])
  }

  if (req.method === 'PATCH') {
    const { name, checked, categoryId } = req.body || {}
    if (!name) return res.status(400).json({ error: 'name is required' })
    if (checked !== undefined) {
      await sql`UPDATE ingredients SET checked = ${checked} WHERE name = ${name}`
    }
    if (categoryId !== undefined) {
      await sql`UPDATE ingredients SET category_id = ${categoryId} WHERE name = ${name}`
    }
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    const name = req.query?.name
    if (!name) return res.status(400).json({ error: 'name is required' })
    await sql`DELETE FROM ingredients WHERE name = ${name}`
    return res.status(200).json({ ok: true })
  }

  res.setHeader('Allow', 'POST, PATCH, DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}
