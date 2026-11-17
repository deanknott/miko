import { describe, it, expect } from 'vitest'
import { SignJWT } from 'jose'
import {
  hashPassword, verifyPassword,
  signSession, verifySession,
  buildSessionCookie, buildClearCookie, getSessionTokenFromRequest, requireAuth,
  generateResetToken, hashResetToken,
  normalizeEmail, validateEmail, validatePassword,
} from '../api/_auth.js'
import { mockReq, mockRes, authCookie } from './helpers.js'

describe('password hashing', () => {
  it('never stores the password in plain text', async () => {
    const hash = await hashPassword('correct horse battery')
    expect(hash).not.toContain('correct horse battery')
    expect(hash).toMatch(/^\$2[aby]\$12\$/)
  })

  it('accepts the right password and rejects a wrong one', async () => {
    const hash = await hashPassword('correct horse battery')
    expect(await verifyPassword('correct horse battery', hash)).toBe(true)
    expect(await verifyPassword('wrong password', hash)).toBe(false)
  })

  it('salts each hash, so the same password gives different hashes', async () => {
    const first = await hashPassword('same password')
    const second = await hashPassword('same password')
    expect(first).not.toBe(second)
  })
})

describe('sessions', () => {
  it('round-trips the user id through a signed token', async () => {
    const token = await signSession(42)
    expect(await verifySession(token)).toEqual({ userId: 42 })
  })

  it('rejects a tampered token', async () => {
    const token = await signSession(42)
    const [header, , signature] = token.split('.')
    const forgedPayload = Buffer.from(JSON.stringify({ sub: '1' })).toString('base64url')
    expect(await verifySession(`${header}.${forgedPayload}.${signature}`)).toBeNull()
  })

  it('rejects a token signed with a different secret', async () => {
    const otherKey = new TextEncoder().encode('not-the-real-secret')
    const token = await new SignJWT({ sub: '42' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30d')
      .sign(otherKey)
    expect(await verifySession(token)).toBeNull()
  })

  it('rejects an expired token', async () => {
    const key = new TextEncoder().encode(process.env.SESSION_SECRET)
    const token = await new SignJWT({ sub: '42' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(key)
    expect(await verifySession(token)).toBeNull()
  })

  it('rejects garbage', async () => {
    expect(await verifySession('not-a-token')).toBeNull()
  })
})

describe('session cookies', () => {
  it('is HttpOnly, SameSite=Lax and Secure in production', () => {
    const cookie = buildSessionCookie('abc', mockReq({ host: 'miko.example.com' }))
    expect(cookie).toMatch(/^miko_session=abc/)
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Lax/i)
    expect(cookie).toMatch(/Secure/i)
  })

  it('drops Secure on localhost so local dev over http works', () => {
    const cookie = buildSessionCookie('abc', mockReq({ host: 'localhost:3000' }))
    expect(cookie).not.toMatch(/Secure/i)
  })

  it('clears the session by expiring the cookie immediately', () => {
    const cookie = buildClearCookie(mockReq({ host: 'miko.example.com' }))
    expect(cookie).toMatch(/^miko_session=;/)
    expect(cookie).toMatch(/Max-Age=0/i)
  })

  it('reads the session token from the request cookie header', () => {
    const req = mockReq({ cookie: 'theme=dark; miko_session=token123' })
    expect(getSessionTokenFromRequest(req)).toBe('token123')
  })
})

describe('requireAuth', () => {
  it('responds 401 when there is no session cookie', async () => {
    const res = mockRes()
    expect(await requireAuth(mockReq(), res)).toBeNull()
    expect(res.statusCode).toBe(401)
  })

  it('responds 401 when the session cookie is invalid', async () => {
    const res = mockRes()
    expect(await requireAuth(mockReq({ cookie: 'miko_session=forged' }), res)).toBeNull()
    expect(res.statusCode).toBe(401)
  })

  it('returns the session for a valid cookie', async () => {
    const res = mockRes()
    const session = await requireAuth(mockReq({ cookie: await authCookie(7) }), res)
    expect(session).toEqual({ userId: 7 })
    expect(res.statusCode).toBeNull()
  })
})

describe('password reset tokens', () => {
  it('generates a random token and stores only its hash', () => {
    const { rawToken, tokenHash } = generateResetToken()
    expect(rawToken).toMatch(/^[0-9a-f]{64}$/)
    expect(tokenHash).not.toBe(rawToken)
    expect(hashResetToken(rawToken)).toBe(tokenHash)
  })

  it('never generates the same token twice', () => {
    expect(generateResetToken().rawToken).not.toBe(generateResetToken().rawToken)
  })
})

describe('input validation', () => {
  it('normalises emails to trimmed lower case', () => {
    expect(normalizeEmail('  Dean@Example.COM ')).toBe('dean@example.com')
    expect(normalizeEmail(undefined)).toBe('')
  })

  it('validates email addresses', () => {
    expect(validateEmail('')).toBe('Email is required')
    expect(validateEmail('not-an-email')).toBe('Enter a valid email address')
    expect(validateEmail('dean@example.com')).toBeNull()
  })

  it('enforces the 8-72 character password rule', () => {
    expect(validatePassword('')).toBe('Password is required')
    expect(validatePassword('a'.repeat(7))).toBe('Password must be at least 8 characters')
    expect(validatePassword('a'.repeat(8))).toBeNull()
    expect(validatePassword('a'.repeat(72))).toBeNull()
    expect(validatePassword('a'.repeat(73))).toBe('Password must be 72 characters or fewer')
  })
})
