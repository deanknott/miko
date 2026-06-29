import { useState } from 'react'
import MatchBar, { matchClass } from './MatchBar.jsx'
import styles from './Suggest.module.css'

export default function Suggest({ getSortedRecipes, recipes }) {
  const [skipped, setSkipped] = useState(new Set())

  function skip(id) {
    setSkipped(prev => new Set([...prev, id]))
  }

  function reset() {
    setSkipped(new Set())
  }

  const sorted = getSortedRecipes(skipped)

  if (recipes.length === 0) {
    return <p className={styles.empty}>Add some recipes first, then come back for a suggestion.</p>
  }

  if (sorted.length === 0) {
    return (
      <p className={styles.empty}>
        You've seen all the options.{' '}
        <button onClick={reset} className={styles.resetLink}>Start over</button>
      </p>
    )
  }

  const top = sorted[0]
  const rest = sorted.slice(1, 4)
  const cls = matchClass(top.pct)

  return (
    <div>
      <div className={styles.topCard}>
        <div className={styles.topLabel}>Cook tonight</div>
        <div className={styles.topName}>{top.name}</div>
        <div className={styles.topReason}>
          {top.pct === 100
            ? 'You have everything you need.'
            : `You have ${top.have.length} of ${top.ings.length} ingredients — missing ${top.missing.slice(0, 2).join(', ')}${top.missing.length > 2 ? ` and ${top.missing.length - 2} more` : ''}.`}
        </div>
        <MatchBar pct={top.pct} />
        <div className={styles.tags}>
          {top.have.map(i => <span key={i} className={`${styles.tag} ${styles.have}`}>{i}</span>)}
          {top.missing.map(i => <span key={i} className={`${styles.tag} ${styles.missing}`}>{i}</span>)}
        </div>
        <div className={styles.actions}>
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(top.name + ' recipe')}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.cookBtn}
          >
            Find recipe ↗
          </a>
          <button onClick={() => skip(top.id)} className={styles.skipBtn}>Show another</button>
        </div>
      </div>

      {rest.length > 0 && (
        <>
          <p className={styles.othersLabel}>Other options</p>
          {rest.map(r => {
            const c = matchClass(r.pct)
            return (
              <div key={r.id} className={styles.otherCard}>
                <div className={styles.otherHeader}>
                  <span className={styles.otherName}>{r.name}</span>
                  <span className={`${styles.pct} ${styles[c]}`}>{r.pct}% match</span>
                </div>
                <MatchBar pct={r.pct} />
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
