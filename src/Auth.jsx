import { useState } from 'react'
import styles from './Auth.module.css'

export default function Auth({ auth }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fieldError, setFieldError] = useState(null)
  const [forgotMessage, setForgotMessage] = useState(null)

  function validate() {
    if (!email.trim()) return 'Email is required'
    if (mode === 'forgot') return null
    if (password.length < 8) return 'Password must be at least 8 characters'
    if (password.length > 72) return 'Password must be 72 characters or fewer'
    if (mode === 'signup' && password !== confirmPassword) return 'Passwords do not match'
    return null
  }

  function switchMode(next) {
    setMode(next)
    setFieldError(null)
    setForgotMessage(null)
    setPassword('')
    setConfirmPassword('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setFieldError(validationError)
      return
    }
    setFieldError(null)
    setForgotMessage(null)
    setSubmitting(true)

    const normalizedEmail = email.trim().toLowerCase()

    if (mode === 'forgot') {
      const result = await auth.forgotPassword(normalizedEmail)
      setSubmitting(false)
      if (result.ok) setForgotMessage(result.message)
      else setFieldError(result.error)
      return
    }

    const action = mode === 'signup' ? auth.signup : auth.login
    const result = await action(normalizedEmail, password)
    setSubmitting(false)
    if (!result.ok) setFieldError(result.error)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.wordmark}>miko</span>
          <span className={styles.tagline}>what should I cook?</span>
        </div>

        <h1 className={styles.title}>
          {mode === 'login' && 'Log in'}
          {mode === 'signup' && 'Sign up'}
          {mode === 'forgot' && 'Reset your password'}
        </h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Email
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={styles.input}
              autoComplete="email"
              required
            />
          </label>

          {mode !== 'forgot' && (
            <label className={styles.label}>
              Password
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={styles.input}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
              />
            </label>
          )}

          {mode === 'signup' && (
            <label className={styles.label}>
              Confirm password
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className={styles.input}
                autoComplete="new-password"
                required
              />
            </label>
          )}

          {fieldError && <p className={styles.error}>{fieldError}</p>}
          {forgotMessage && <p className={styles.success}>{forgotMessage}</p>}

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? 'Please wait…' : mode === 'login' ? 'Log in' : mode === 'signup' ? 'Sign up' : 'Send reset link'}
          </button>
        </form>

        <div className={styles.switchRow}>
          {mode === 'login' && (
            <>
              <button onClick={() => switchMode('forgot')} className={styles.linkBtn}>Forgot password?</button>
              <button onClick={() => switchMode('signup')} className={styles.linkBtn}>Don't have an account? Sign up</button>
            </>
          )}
          {mode === 'signup' && (
            <button onClick={() => switchMode('login')} className={styles.linkBtn}>Already have an account? Log in</button>
          )}
          {mode === 'forgot' && (
            <button onClick={() => switchMode('login')} className={styles.linkBtn}>Back to log in</button>
          )}
        </div>
      </div>
    </div>
  )
}
