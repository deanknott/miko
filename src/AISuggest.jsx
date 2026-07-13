import { useState } from 'react'
import { api } from './apiClient.js'
import styles from './AISuggest.module.css'

export default function AISuggest({ onGoToSettings }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [recipes, setRecipes] = useState(null)

  async function handleGetSuggestions() {
    setLoading(true)
    setError(null)
    setRecipes(null)
    try {
      const data = await api('/api/suggest-ai', { method: 'POST' })
      setRecipes(data.recipes)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.intro}>
        Ask your configured AI to suggest recipes using the ingredients you've checked off on the Ingredients page.
      </p>

      <button onClick={handleGetSuggestions} className={styles.suggestBtn} disabled={loading}>
        {loading ? 'Thinking…' : 'Get suggestions'}
      </button>

      {error && (
        <div className={styles.errorBox}>
          <p>{error}</p>
          {error.includes('Settings') && (
            <button onClick={onGoToSettings} className={styles.settingsLink}>Go to Settings</button>
          )}
        </div>
      )}

      {recipes && recipes.length === 0 && (
        <p className={styles.empty}>No suggestions came back — try checking off a few more ingredients.</p>
      )}

      {recipes && recipes.length > 0 && (
        <div className={styles.results}>
          {recipes.map((recipe, i) => (
            <div key={i} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardName}>{recipe.name}</div>
                {recipe.cookingTime && <span className={styles.cookingTime}>{recipe.cookingTime}</span>}
              </div>
              {recipe.description && <p className={styles.description}>{recipe.description}</p>}
              {Array.isArray(recipe.ingredientsUsed) && recipe.ingredientsUsed.length > 0 && (
                <div className={styles.tags}>
                  {recipe.ingredientsUsed.map(ing => (
                    <span key={ing} className={styles.tag}>{ing}</span>
                  ))}
                </div>
              )}
              {Array.isArray(recipe.steps) && recipe.steps.length > 0 && (
                <ol className={styles.steps}>
                  {recipe.steps.map((step, stepIndex) => (
                    <li key={stepIndex}>{step}</li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
