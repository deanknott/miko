import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sql } from '../../api/_db.js'
import { encryptSecret } from '../../api/_crypto.js'
import suggestAi from '../../api/suggest-ai.js'
import { mockReq, mockRes, authCookie } from '../helpers.js'

vi.mock('../../api/_db.js', () => ({ sql: vi.fn() }))

const CONFIGURED_USER = {
  aiEndpointUrl: 'https://ai.example.com/v1',
  aiModel: 'test-model',
  aiApiKeyEncrypted: encryptSecret('sk-real-key'),
}

// suggest-ai runs two queries in parallel: the user's AI settings and their checked ingredients.
function mockDatabase({ user = CONFIGURED_USER, checked = ['egg', 'rice', 'spinach'] } = {}) {
  sql.mockImplementation(strings => {
    const text = strings.join('?')
    if (text.includes('FROM users')) return Promise.resolve(user ? [user] : [])
    if (text.includes('FROM ingredients')) return Promise.resolve(checked.map(name => ({ name })))
    return Promise.resolve([])
  })
}

function upstreamResponse({ ok = true, status = 200, body }) {
  return { ok, status, json: async () => body }
}

function chatCompletion(content) {
  return { choices: [{ message: { content } }] }
}

async function callSuggest() {
  const res = mockRes()
  await suggestAi(mockReq({ method: 'POST', cookie: await authCookie() }), res)
  return res
}

beforeEach(() => {
  sql.mockReset()
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('POST /api/suggest-ai', () => {
  it('asks the user to configure a provider first', async () => {
    mockDatabase({ user: { aiEndpointUrl: null, aiModel: null, aiApiKeyEncrypted: null } })
    const res = await callSuggest()
    expect(res.statusCode).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('asks the user to tick some ingredients first', async () => {
    mockDatabase({ checked: [] })
    const res = await callSuggest()
    expect(res.statusCode).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('sends the decrypted key to the configured endpoint', async () => {
    mockDatabase()
    fetch.mockResolvedValueOnce(upstreamResponse({ body: chatCompletion('{"recipes": []}') }))
    await callSuggest()

    const [url, options] = fetch.mock.calls[0]
    expect(url).toBe('https://ai.example.com/v1/chat/completions')
    expect(options.headers.Authorization).toBe('Bearer sk-real-key')
    expect(JSON.parse(options.body).messages[1].content).toContain('egg, rice, spinach')
  })

  it('returns 502 when the endpoint cannot be reached', async () => {
    mockDatabase()
    fetch.mockRejectedValueOnce(new Error('connect ECONNREFUSED'))
    const res = await callSuggest()
    expect(res.statusCode).toBe(502)
    expect(res.body.error).toContain("Couldn't reach your AI endpoint")
  })

  it('passes on the provider error message', async () => {
    mockDatabase()
    fetch.mockResolvedValueOnce(upstreamResponse({ ok: false, status: 401, body: { error: { message: 'Invalid API key' } } }))
    const res = await callSuggest()
    expect(res.statusCode).toBe(502)
    expect(res.body.error).toBe('Your AI provider returned an error (401): Invalid API key')
  })

  it("handles Gemini's array-wrapped error format", async () => {
    mockDatabase()
    fetch.mockResolvedValueOnce(upstreamResponse({ ok: false, status: 429, body: [{ error: { message: 'Quota exceeded' } }] }))
    const res = await callSuggest()
    expect(res.body.error).toBe('Your AI provider returned an error (429): Quota exceeded')
  })

  it('returns 502 when the reply is not valid JSON', async () => {
    mockDatabase()
    fetch.mockResolvedValueOnce(upstreamResponse({ body: chatCompletion('Sure! Here are some ideas...') }))
    const res = await callSuggest()
    expect(res.statusCode).toBe(502)
  })

  it('returns 502 when the reply has no content', async () => {
    mockDatabase()
    fetch.mockResolvedValueOnce(upstreamResponse({ body: { choices: [] } }))
    const res = await callSuggest()
    expect(res.statusCode).toBe(502)
  })

  it('accepts JSON wrapped in a code fence and drops ingredients the user does not have', async () => {
    mockDatabase()
    const reply = '```json\n' + JSON.stringify({
      recipes: [{ name: 'Egg Fried Rice', description: 'Quick', ingredientsUsed: ['Egg', 'rice', 'soy sauce'], steps: ['Cook'], cookingTime: '15 minutes' }],
    }) + '\n```'
    fetch.mockResolvedValueOnce(upstreamResponse({ body: chatCompletion(reply) }))
    const res = await callSuggest()

    expect(res.statusCode).toBe(200)
    expect(res.body.recipes[0].name).toBe('Egg Fried Rice')
    expect(res.body.recipes[0].ingredientsUsed).toEqual(['Egg', 'rice'])
  })
})
