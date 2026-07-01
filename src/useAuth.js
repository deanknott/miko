import { useState, useEffect } from 'react'
import { api } from './apiClient.js'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // See useStore.js — guards against StrictMode's double-invoked mount effect
    // racing two /api/auth/me requests and applying whichever resolves last.
    let ignore = false
    api('/api/auth/me')
      .then(data => { if (!ignore) setUser(data.user) })
      .catch(() => { if (!ignore) setUser(null) })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [])

  async function signup(email, password) {
    try {
      const data = await api('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) })
      setUser(data.user)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  }

  async function login(email, password) {
    try {
      const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      setUser(data.user)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  }

  async function logout() {
    try {
      await api('/api/auth/logout', { method: 'POST' })
    } finally {
      setUser(null)
    }
  }

  async function forgotPassword(email) {
    try {
      const data = await api('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) })
      return { ok: true, message: data.message }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  }

  async function resetPassword(token, newPassword) {
    try {
      const data = await api('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) })
      setUser(data.user)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  }

  return { user, loading, error, signup, login, logout, forgotPassword, resetPassword }
}
