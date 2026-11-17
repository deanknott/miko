import { signSession } from '../api/_auth.js'

// Minimal stand-in for Vercel's request object.
export function mockReq({ method = 'GET', body, query, cookie, host = 'localhost:3000' } = {}) {
  return {
    method,
    body,
    query,
    headers: { host, ...(cookie ? { cookie } : {}) },
  }
}

// Minimal stand-in for Vercel's response object; records what the handler sent.
export function mockRes() {
  return {
    statusCode: null,
    body: undefined,
    headers: {},
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
    setHeader(name, value) {
      this.headers[name] = value
    },
  }
}

export async function authCookie(userId = 1) {
  return `miko_session=${await signSession(userId)}`
}

// The SQL text of the nth call to a mocked `sql` tagged template.
export function queryText(sqlMock, callIndex) {
  return sqlMock.mock.calls[callIndex][0].join('?')
}

// The interpolated values of the nth call to a mocked `sql` tagged template.
export function queryValues(sqlMock, callIndex) {
  return sqlMock.mock.calls[callIndex].slice(1)
}
