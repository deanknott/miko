import { useState } from 'react'
import styles from './Auth.module.css'

export default function ResetPassword({ auth, token, onSuccess }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (newPassword.length < 8) return setError('Password must be at least 8 characters')
    if (newPassword.length > 72) return setError('Password must be 72 characters or fewer')
    if (newPassword !== confirmPassword) return setError('Passwords do not match')

    setError(null)
    setSubmitting(true)
    const result = await auth.resetPassword(token, newPassword)
    setSubmitting(false)
    if (result.ok) {
      window.history.replaceState(null, '', window.location.pathname)
      onSuccess()
    } else {
      setError(result.error)
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.wordmark}>miko</span>
          <span className={styles.tagline}>what should I cook?</span>
        </div>

        <h1 className={styles.title}>Set a new password</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            New password
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className={styles.input}
              autoComplete="new-password"
              required
            />
          </label>

          <label className={styles.label}>
            Confirm new password
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className={styles.input}
              autoComplete="new-password"
              required
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? 'Please wait…' : 'Set new password'}
          </button>
        </form>
      </div>
    </div>
  )
}
