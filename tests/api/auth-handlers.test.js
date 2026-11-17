import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sql } from '../../api/_db.js'
import { sendPasswordResetEmail } from '../../api/_email.js'
import { hashPassword, verifyPassword, hashResetToken } from '../../api/_auth.js'
import login from '../../api/auth/login.js'
import signup from '../../api/auth/signup.js'
import me from '../../api/auth/me.js'
import forgotPassword from '../../api/auth/forgot-password.js'
import resetPassword from '../../api/auth/reset-password.js'
import { mockReq, mockRes, queryText, queryValues } from '../helpers.js'

vi.mock('../../api/_db.js', () => ({ sql: vi.fn() }))
vi.mock('../../api/_email.js', () => ({ sendPasswordResetEmail: vi.fn() }))

beforeEach(() => {
  sql.mockReset()
  sendPasswordResetEmail.mockReset()
})

describe('POST /api/auth/login', () => {
  it('rejects other methods', async () => {
    const res = mockRes()
    await login(mockReq({ method: 'GET' }), res)
    expect(res.statusCode).toBe(405)
  })

  it('rejects a missing password without touching the database', async () => {
    const res = mockRes()
    await login(mockReq({ method: 'POST', body: { email: 'dean@example.com' } }), res)
    expect(res.statusCode).toBe(401)
    expect(sql).not.toHaveBeenCalled()
  })

  it('gives the same error for an unknown email and a wrong password', async () => {
    sql.mockResolvedValueOnce([])
    const unknownRes = mockRes()
    await login(mockReq({ method: 'POST', body: { email: 'nobody@example.com', password: 'password123' } }), unknownRes)

    sql.mockResolvedValueOnce([{ id: 1, email: 'dean@example.com', password_hash: await hashPassword('right-password') }])
    const wrongRes = mockRes()
    await login(mockReq({ method: 'POST', body: { email: 'dean@example.com', password: 'wrong-password' } }), wrongRes)

    expect(unknownRes.statusCode).toBe(401)
    expect(wrongRes.statusCode).toBe(401)
    expect(unknownRes.body).toEqual(wrongRes.body)
  })

  it('logs in with the right password and sets a session cookie', async () => {
    sql.mockResolvedValueOnce([{ id: 1, email: 'dean@example.com', password_hash: await hashPassword('right-password') }])
    const res = mockRes()
    await login(mockReq({ method: 'POST', body: { email: ' Dean@Example.com ', password: 'right-password' } }), res)

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ user: { id: 1, email: 'dean@example.com' } })
    expect(res.headers['Set-Cookie']).toMatch(/^miko_session=/)
    expect(queryValues(sql, 0)).toEqual(['dean@example.com'])
  })
})

describe('POST /api/auth/signup', () => {
  it('rejects an invalid email', async () => {
    const res = mockRes()
    await signup(mockReq({ method: 'POST', body: { email: 'nope', password: 'password123' } }), res)
    expect(res.statusCode).toBe(400)
  })

  it('rejects a password that is too short', async () => {
    const res = mockRes()
    await signup(mockReq({ method: 'POST', body: { email: 'dean@example.com', password: 'short' } }), res)
    expect(res.statusCode).toBe(400)
  })

  it('rejects an email that is already registered', async () => {
    sql.mockResolvedValueOnce([{ id: 1 }])
    const res = mockRes()
    await signup(mockReq({ method: 'POST', body: { email: 'dean@example.com', password: 'password123' } }), res)
    expect(res.statusCode).toBe(409)
  })

  it('stores a hash of the password, never the password itself', async () => {
    sql.mockResolvedValueOnce([])
    sql.mockResolvedValueOnce([{ id: 5, email: 'dean@example.com' }])
    const res = mockRes()
    await signup(mockReq({ method: 'POST', body: { email: 'dean@example.com', password: 'password123' } }), res)

    expect(res.statusCode).toBe(201)
    expect(res.headers['Set-Cookie']).toMatch(/^miko_session=/)
    const [, storedHash] = queryValues(sql, 1)
    expect(storedHash).not.toBe('password123')
    expect(await verifyPassword('password123', storedHash)).toBe(true)
  })
})

describe('GET /api/auth/me', () => {
  it('responds 401 without a session', async () => {
    const res = mockRes()
    await me(mockReq({ method: 'GET' }), res)
    expect(res.statusCode).toBe(401)
    expect(sql).not.toHaveBeenCalled()
  })
})

describe('POST /api/auth/forgot-password', () => {
  it('gives the same response for an unknown email and sends nothing', async () => {
    sql.mockResolvedValueOnce([])
    const res = mockRes()
    await forgotPassword(mockReq({ method: 'POST', body: { email: 'nobody@example.com' } }), res)

    expect(res.statusCode).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(sendPasswordResetEmail).not.toHaveBeenCalled()
  })

  it('emails the raw token but stores only its hash', async () => {
    sql.mockResolvedValueOnce([{ id: 1 }])
    sql.mockResolvedValueOnce([])
    const res = mockRes()
    await forgotPassword(mockReq({ method: 'POST', body: { email: 'dean@example.com' } }), res)

    const [, resetUrl] = sendPasswordResetEmail.mock.calls[0]
    const rawToken = new URL(resetUrl).searchParams.get('resetToken')
    const [, storedHash] = queryValues(sql, 1)

    expect(storedHash).not.toBe(rawToken)
    expect(storedHash).toBe(hashResetToken(rawToken))
    expect(queryText(sql, 1)).toContain("interval '1 hour'")
    expect(res.statusCode).toBe(200)
  })

  it('still responds normally if the email fails to send', async () => {
    sql.mockResolvedValueOnce([{ id: 1 }])
    sql.mockResolvedValueOnce([])
    sendPasswordResetEmail.mockRejectedValueOnce(new Error('SMTP down'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = mockRes()
    await forgotPassword(mockReq({ method: 'POST', body: { email: 'dean@example.com' } }), res)
    expect(res.statusCode).toBe(200)
  })
})

describe('POST /api/auth/reset-password', () => {
  it('requires a token', async () => {
    const res = mockRes()
    await resetPassword(mockReq({ method: 'POST', body: { newPassword: 'password123' } }), res)
    expect(res.statusCode).toBe(400)
  })

  it('applies the same password rules as signup', async () => {
    const res = mockRes()
    await resetPassword(mockReq({ method: 'POST', body: { token: 'abc', newPassword: 'short' } }), res)
    expect(res.statusCode).toBe(400)
    expect(sql).not.toHaveBeenCalled()
  })

  it('rejects an expired, used or unknown token', async () => {
    sql.mockResolvedValueOnce([])
    const res = mockRes()
    await resetPassword(mockReq({ method: 'POST', body: { token: 'abc', newPassword: 'password123' } }), res)

    expect(res.statusCode).toBe(400)
    expect(res.body.error).toBe('This reset link is invalid or has expired')
    expect(queryText(sql, 0)).toContain('used_at IS NULL')
    expect(queryText(sql, 0)).toContain('expires_at > now()')
  })

  it('looks the token up by its hash, updates the password and marks the token used', async () => {
    sql.mockResolvedValueOnce([{ id: 10, userId: 1 }])
    sql.mockResolvedValueOnce([])
    sql.mockResolvedValueOnce([])
    sql.mockResolvedValueOnce([{ id: 1, email: 'dean@example.com' }])
    const res = mockRes()
    await resetPassword(mockReq({ method: 'POST', body: { token: 'abc', newPassword: 'new-password' } }), res)

    expect(queryValues(sql, 0)).toEqual([hashResetToken('abc')])
    const [newHash] = queryValues(sql, 1)
    expect(await verifyPassword('new-password', newHash)).toBe(true)
    expect(queryText(sql, 2)).toContain('used_at = now()')
    expect(res.statusCode).toBe(200)
    expect(res.headers['Set-Cookie']).toMatch(/^miko_session=/)
  })
})
