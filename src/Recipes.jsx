import { useState } from 'react'
import MatchBar, { matchClass } from './MatchBar.jsx'
import styles from './Recipes.module.css'

function RecipeCard({ recipe, match, onDelete, onUpdateIngs }) {
  const [editing, setEditing] = useState(false)
  const cls = match.unmakable ? 'unmakable' : matchClass(match.pct)

  function toggleEssential(name) {
    const updated = recipe.ings.map(i => i.name === name ? { ...i, essential: !i.essential } : i)
    onUpdateIngs(recipe.id, updated)
  }

  return (
    <div className={`${styles.card} ${match.unmakable ? styles.cardUnmakable : ''}`}>
      <div className={styles.cardHeader}>
        <span className={styles.cardName}>{recipe.name}</span>
        <div className={styles.cardRight}>
          {match.unmakable
            ? <span className={styles.unmakableLabel}>unmakable</span>
            : <span className={`${styles.pct} ${styles[cls]}`}>{match.pct}% match</span>
          }
          <button
            onClick={() => setEditing(e => !e)}
            className={`${styles.editBtn} ${editing ? styles.editBtnActive : ''}`}
            aria-label="Edit essential ingredients"
          >
            edit
          </button>
          <button onClick={() => onDelete(recipe.id)} className={styles.deleteBtn} aria-label={`Delete ${recipe.name}`}>
            ✕
          </button>
        </div>
      </div>

      {!match.unmakable && <MatchBar pct={match.pct} />}

      {editing ? (
        <>
          <p className={styles.essentialHint}>Tap ★ to toggle essential</p>
          <div className={styles.chipGrid} style={{ marginTop: '10px' }}>
            {recipe.ings.map(ing => {
              const inStock = match.have.includes(ing.name)
              return (
                <div key={ing.name} className={`${styles.chip} ${ing.essential ? styles.chipEssential : ''} ${!inStock ? styles.chipMissing : ''}`}>
                  <button
                    onClick={() => toggleEssential(ing.name)}
                    className={styles.essentialBtn}
                    aria-label={`Mark ${ing.name} as ${ing.essential ? 'optional' : 'essential'}`}
                    title={ing.essential ? 'Essential — click to make optional' : 'Optional — click to make essential'}
                  >
                    ★
                  </button>
                  <span>{ing.name}</span>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div className={styles.tags}>
          {recipe.ings.map(ing => {
            const inStock = match.have.includes(ing.name)
            return (
              <span
                key={ing.name}
                className={`${styles.tag} ${inStock ? styles.have : styles.missing} ${ing.essential ? styles.essential : ''}`}
              >
                {ing.essential ? '★ ' : ''}{ing.name}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AddRecipeForm({ onSave, onCancel }) {
  const [name, setName] = useState('')
  const [ingInput, setIngInput] = useState('')
  const [ings, setIngs] = useState([])

  function addIng() {
    const val = ingInput.trim().toLowerCase()
    if (!val || ings.some(i => i.name === val)) return
    setIngs(prev => [...prev, { name: val, essential: false }])
    setIngInput('')
  }

  function removeIng(name) {
    setIngs(prev => prev.filter(i => i.name !== name))
  }

  function toggleEssential(name) {
    setIngs(prev => prev.map(i => i.name === name ? { ...i, essential: !i.essential } : i))
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
        <>
          <p className={styles.essentialHint}>Tap ★ to mark an ingredient as essential</p>
          <div className={styles.chipGrid}>
            {ings.map(ing => (
              <div key={ing.name} className={`${styles.chip} ${ing.essential ? styles.chipEssential : ''}`}>
                <button
                  onClick={() => toggleEssential(ing.name)}
                  className={styles.essentialBtn}
                  aria-label={`Mark ${ing.name} as ${ing.essential ? 'optional' : 'essential'}`}
                >
                  ★
                </button>
                <span>{ing.name}</span>
                <button onClick={() => removeIng(ing.name)} className={styles.chipRemove} aria-label={`Remove ${ing.name}`}>×</button>
              </div>
            ))}
          </div>
        </>
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

export default function Recipes({ recipes, getMatch, addRecipe, removeRecipe, updateRecipeIngs }) {
  const [showForm, setShowForm] = useState(false)

  function handleSave(name, ings) {
    addRecipe(name, ings)
    setShowForm(false)
  }

  const makable = recipes.filter(r => !getMatch(r).unmakable)
  const unmakable = recipes.filter(r => getMatch(r).unmakable)

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

      {makable.map(r => (
        <RecipeCard key={r.id} recipe={r} match={getMatch(r)} onDelete={removeRecipe} onUpdateIngs={updateRecipeIngs} />
      ))}

      {unmakable.length > 0 && (
        <>
          <p className={styles.sectionLabel}>Unmakable</p>
          {unmakable.map(r => (
            <RecipeCard key={r.id} recipe={r} match={getMatch(r)} onDelete={removeRecipe} onUpdateIngs={updateRecipeIngs} />
          ))}
        </>
      )}
    </div>
  )
}