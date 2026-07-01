import { useState } from 'react'
import { useAuth } from './useAuth.js'
import Auth from './Auth.jsx'
import ResetPassword from './ResetPassword.jsx'
import MainApp from './MainApp.jsx'
import styles from './App.module.css'

function getResetTokenFromUrl() {
  return new URLSearchParams(window.location.search).get('resetToken')
}

export default function App() {
  const auth = useAuth()
  const [resetToken, setResetToken] = useState(getResetTokenFromUrl)

  if (resetToken) {
    return <ResetPassword auth={auth} token={resetToken} onSuccess={() => setResetToken(null)} />
  }

  if (auth.loading) {
    return (
      <div className={styles.layout}>
        <p className={styles.loading}>Loading…</p>
      </div>
    )
  }

  if (!auth.user) {
    return <Auth auth={auth} />
  }

  return <MainApp user={auth.user} onLogout={auth.logout} />
}
