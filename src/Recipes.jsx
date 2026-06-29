import { useState } from 'react'
import MatchBar, { matchClass } from './MatchBar.jsx'
import styles from './Recipes.module.css'

function RecipeCard({ recipe, match, onDelete }) {
  const cls = matchClass(match.pct)
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardName}>{recipe.name}</span>
        <div className={styles.cardRight}>
          <span className={`${styles.pct} ${styles[cls]}`}>{match.pct}% match</span>
          <button onClick={() => onDelete(recipe.id)} className={styles.deleteBtn} aria-label={`Delete ${recipe.name}`}>
            ✕
          </button>
        </div>
      </div>
      <MatchBar pct={match.pct} />
      <div className={styles.tags}>
        {match.have.map(i => <span key={i} className={`${styles.tag} ${styles.have}`}>{i}</span>)}
        {match.missing.map(i => <span key={i} className={`${styles.tag} ${styles.missing}`}>{i}</span>)}
      </div>
    </div>
  )
}

function AddRecipeForm({ onSave, onCancel }) {
  const [name, setName] = useState('')
  const [ingInput, setIngInput] = useState('')
  const [ings, setIngs] = useState([])

  function addIng() {
    const val = ingInput.trim().toLowerCase()
    if (!val || ings.includes(val)) return
    setIngs(prev => [...prev, val])
    setIngInput('')
  }

  function removeIng(ing) {
    setIngs(prev => prev.filter(i => i !== ing))
  }

  function handleSave() {
    if (!name.trim() || ings.length === 0) return
    onSave(name, ings)
  }

  return (
    <div className={styles.addForm}>
      <h4 className={styles.addFormTitle}>New recipe</h4>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Recipe name (e.g. pasta carbonara)"
        className={styles.input}
      />
      <div className={styles.addRow}>
        <input
          type="text"
          value={ingInput}
          onChange={e => setIngInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addIng()}
          placeholder="Add an ingredient"
          className={styles.input}
        />
        <button onClick={addIng} className={styles.addBtn}>Add</button>
      </div>
      {ings.length > 0 && (
        <div className={styles.chipGrid}>
          {ings.map(ing => (
            <div key={ing} className={styles.chip}>
              <span>{ing}</span>
              <button onClick={() => removeIng(ing)} className={styles.chipRemove} aria-label={`Remove ${ing}`}>×</button>
            </div>
          ))}
        </div>
      )}
      <div className={styles.formActions}>
        <button onClick={handleSave} className={styles.saveBtn} disabled={!name.trim() || ings.length === 0}>
          Save recipe
        </button>
        <button onClick={onCancel} className={styles.cancelBtn}>Cancel</button>
      </div>
    </div>
  )
}

export default function Recipes({ recipes, getMatch, addRecipe, removeRecipe }) {
  const [showForm, setShowForm] = useState(false)

  function handleSave(name, ings) {
    addRecipe(name, ings)
    setShowForm(false)
  }

  return (
    <div>
      {!showForm && (
        <button onClick={() => setShowForm(true)} className={styles.newBtn}>
          + New recipe
        </button>
      )}

      {showForm && (
        <AddRecipeForm onSave={handleSave} onCancel={() => setShowForm(false)} />
      )}

      {recipes.length === 0 && !showForm && (
        <p className={styles.empty}>No recipes yet. Add your first one above.</p>
      )}

      {recipes.map(r => (
        <RecipeCard key={r.id} recipe={r} match={getMatch(r)} onDelete={removeRecipe} />
      ))}
    </div>
  )
}
