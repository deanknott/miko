// api/_auth.js and api/_crypto.js read SESSION_SECRET when they load,
// so it has to be set before any test imports them.
process.env.SESSION_SECRET = 'test-session-secret'
