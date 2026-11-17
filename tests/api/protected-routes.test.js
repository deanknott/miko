import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sql } from '../../api/_db.js'
import state from '../../api/state.js'
import recipes from '../../api/recipes.js'
import ingredients from '../../api/ingredients.js'
import categories from '../../api/categories.js'
import settings from '../../api/settings.js'
import suggestAi from '../../api/suggest-ai.js'
import { mockReq, mockRes } from '../helpers.js'

vi.mock('../../api/_db.js', () => ({ sql: vi.fn() }))

const ROUTES = [
  ['GET /api/state', state, 'GET'],
  ['POST /api/state', state, 'POST'],
  ['POST /api/recipes', recipes, 'POST'],
  ['DELETE /api/recipes', recipes, 'DELETE'],
  ['POST /api/ingredients', ingredients, 'POST'],
  ['PATCH /api/categories', categories, 'PATCH'],
  ['GET /api/settings', settings, 'GET'],
  ['POST /api/suggest-ai', suggestAi, 'POST'],
]

beforeEach(() => {
  sql.mockReset()
})

describe('protected routes', () => {
  it.each(ROUTES)('%s responds 401 without a session', async (_, handler, method) => {
    const res = mockRes()
    await handler(mockReq({ method, body: {}, query: { id: '1' } }), res)
    expect(res.statusCode).toBe(401)
    expect(sql).not.toHaveBeenCalled()
  })

  it.each(ROUTES)('%s responds 401 with a forged session', async (_, handler, method) => {
    const res = mockRes()
    await handler(mockReq({ method, body: {}, query: { id: '1' }, cookie: 'miko_session=forged.token.value' }), res)
    expect(res.statusCode).toBe(401)
    expect(sql).not.toHaveBeenCalled()
  })
})
