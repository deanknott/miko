import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { parseCookie, stringifySetCookie } from 'cookie'

const COOKIE_NAME = 'miko_session'
const SESSION_DURATION = '30d'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

const secretKey = new TextEncoder().encode(process.env.SESSION_SECRET)

export async function hashPassword(password) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

export async function signSession(userId) {
  return new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(secretKey)
}

export async function verifySession(token) {
  try {
    const { payload } = await jwtVerify(token, secretKey)
    return { userId: Number(payload.sub) }
  } catch {
    return null
  }
}

function isLocalRequest(req) {
  return Boolean(req.headers.host?.includes('localhost'))
}

export function buildSessionCookie(token, req) {
  return stringifySetCookie({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: !isLocalRequest(req),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export function buildClearCookie(req) {
  return stringifySetCookie({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: !isLocalRequest(req),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

export function getSessionTokenFromRequest(req) {
  const parsed = parseCookie(req.headers.cookie || '')
  return parsed[COOKIE_NAME]
}

export async function requireAuth(req, res) {
  const token = getSessionTokenFromRequest(req)
  const session = token ? await verifySession(token) : null
  if (!session) {
    res.status(401).json({ error: 'Not authenticated' })
    return null
  }
  return session
}

export function generateResetToken() {
  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(rawToken).digest('hex')
  return { rawToken, tokenHash }
}

export function hashResetToken(rawToken) {
  return createHash('sha256').update(rawToken).digest('hex')
}

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/

export function normalizeEmail(email) {
  return (email || '').trim().toLowerCase()
}

export function validateEmail(email) {
  if (!email) return 'Email is required'
  if (!EMAIL_PATTERN.test(email)) return 'Enter a valid email address'
  return null
}

export function validatePassword(password) {
  if (!password) return 'Password is required'
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (password.length > 72) return 'Password must be 72 characters or fewer'
  return null
}
