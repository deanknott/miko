import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sql } from '../../api/_db.js'
import { encryptSecret, decryptSecret } from '../../api/_crypto.js'
import settings from '../../api/settings.js'
import { mockReq, mockRes, authCookie, queryText, queryValues } from '../helpers.js'

vi.mock('../../api/_db.js', () => ({ sql: vi.fn() }))

beforeEach(() => {
  sql.mockReset()
})

describe('GET /api/settings', () => {
  it('reports whether a key is saved but never sends the key back', async () => {
    const encrypted = encryptSecret('sk-secret-key')
    sql.mockResolvedValueOnce([{ aiEndpointUrl: 'https://api.openai.com/v1', aiModel: 'gpt-4o-mini', aiApiKeyEncrypted: encrypted }])
    const res = mockRes()
    await settings(mockReq({ method: 'GET', cookie: await authCookie() }), res)

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ aiEndpointUrl: 'https://api.openai.com/v1', aiModel: 'gpt-4o-mini', hasApiKey: true })
    expect(JSON.stringify(res.body)).not.toContain(encrypted)
  })
})

describe('PATCH /api/settings', () => {
  it('encrypts the API key before storing it', async () => {
    sql.mockResolvedValue([])
    const res = mockRes()
    await settings(mockReq({ method: 'PATCH', cookie: await authCookie(), body: { aiApiKey: 'sk-secret-key' } }), res)

    expect(res.statusCode).toBe(200)
    const [stored] = queryValues(sql, 0)
    expect(stored).not.toBe('sk-secret-key')
    expect(decryptSecret(stored)).toBe('sk-secret-key')
  })

  it('clears the key when an empty one is saved', async () => {
    sql.mockResolvedValue([])
    const res = mockRes()
    await settings(mockReq({ method: 'PATCH', cookie: await authCookie(), body: { aiApiKey: '' } }), res)
    expect(queryValues(sql, 0)[0]).toBeNull()
  })

  it('strips trailing slashes from the endpoint URL', async () => {
    sql.mockResolvedValue([])
    const res = mockRes()
    await settings(mockReq({ method: 'PATCH', cookie: await authCookie(), body: { aiEndpointUrl: ' https://api.openai.com/v1/ ' } }), res)
    expect(queryText(sql, 0)).toContain('ai_endpoint_url')
    expect(queryValues(sql, 0)[0]).toBe('https://api.openai.com/v1')
  })
})
