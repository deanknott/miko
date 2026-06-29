import styles from './MatchBar.module.css'

export function matchClass(pct) {
  if (pct === 100) return 'full'
  if (pct >= 50) return 'partial'
  return 'low'
}

export default function MatchBar({ pct }) {
  const cls = matchClass(pct)
  return (
    <div className={styles.wrap}>
      <div className={`${styles.bar} ${styles[cls]}`} style={{ width: `${pct}%` }} />
    </div>
  )
}
