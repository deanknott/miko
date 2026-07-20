import { useState } from 'react'
import MatchBar, { matchClass } from './MatchBar.jsx'
import styles from './Recipes.module.css'

function IngredientAutocomplete({ ingredients, excludeNames, onAdd }) {
  const [input, setInput] = useState('')
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)

  function handleAdd(rawValue) {
    const val = (rawValue ?? input).trim().toLowerCase()
    if (!val || excludeNames.includes(val)) return
    onAdd(val)
    setInput('')
    setSuggestionsOpen(false)
  }

  return (
    <div className={styles.autocompleteWrap}>
      <div className={styles.addRow}>
        <input
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); setSuggestionsOpen(true) }}
          onFocus={() => setSuggestionsOpen(true)}
          onBlur={() => setSuggestionsOpen(false)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Add an ingredient"
          className={styles.input}
        />
        <button onClick={() => handleAdd()} className={styles.addBtn}>Add</button>
      </div>
      {suggestionsOpen && (() => {
        const query = input.trim().toLowerCase()
        const suggestions = ingredients
          .filter(ing => !excludeNames.includes(ing.name))
          .filter(ing => ing.name.includes(query))
        if (suggestions.length === 0) return null
        return (
          <ul className={styles.suggestionList}>
            {suggestions.map(ing => (
              <li key={ing.name}>
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); handleAdd(ing.name) }}
                  className={styles.suggestionItem}
                >
                  {ing.name}
                </button>
              </li>
            ))}
          </ul>
        )
      })()}
    </div>
  )
}

function RecipeCard({ recipe, match, ingredients, onDelete, onUpdateIngs }) {
  const [editing, setEditing] = useState(false)
  const cls = match.unmakable ? 'unmakable' : matchClass(match.pct)

  function toggleEssential(name) {
    const updated = recipe.ings.map(i => i.name === name ? { ...i, essential: !i.essential } : i)
    onUpdateIngs(recipe.id, updated)
  }

  function renameIngredient(oldName, rawNewName) {
    const newName = rawNewName.trim().toLowerCase()
    if (!newName || newName === oldName) return
    if (recipe.ings.some(i => i.name === newName)) return
    const updated = recipe.ings.map(i => i.name === oldName ? { ...i, name: newName } : i)
    onUpdateIngs(recipe.id, updated)
  }

  function addIngredient(name) {
    onUpdateIngs(recipe.id, [...recipe.ings, { name, essential: false }])
  }

  function removeIngredient(name) {
    if (recipe.ings.length <= 1) return
    onUpdateIngs(recipe.id, recipe.ings.filter(i => i.name !== name))
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
          <p className={styles.essentialHint}>Tap ★ to toggle essential · click a name to rename</p>
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
                  <input
                    type="text"
                    defaultValue={ing.name}
                    size={Math.max(ing.name.length, 4)}
                    onBlur={e => renameIngredient(ing.name, e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                    className={styles.chipNameInput}
                    aria-label={`Rename ${ing.name}`}
                  />
                  <button
                    onClick={() => removeIngredient(ing.name)}
                    className={styles.chipRemove}
                    aria-label={`Remove ${ing.name}`}
                    disabled={recipe.ings.length <= 1}
                    title={recipe.ings.length <= 1 ? 'A recipe needs at least one ingredient' : undefined}
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
          <IngredientAutocomplete
            ingredients={ingredients}
            excludeNames={recipe.ings.map(i => i.name)}
            onAdd={addIngredient}
          />
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

function AddRecipeForm({ ingredients, onSave, onCancel }) {
  const [name, setName] = useState('')
  const [ings, setIngs] = useState([])

  function addIng(name) {
    setIngs(prev => [...prev, { name, essential: false }])
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
      <IngredientAutocomplete
        ingredients={ingredients}
        excludeNames={ings.map(i => i.name)}
        onAdd={addIng}
      />
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

export default function Recipes({ recipes, ingredients, getMatch, addRecipe, removeRecipe, updateRecipeIngs }) {
  const [showForm, setShowForm] = useState(false)

  function handleSave(name, ings) {
    addRecipe(name, ings)
    setShowForm(false)
  }

  const makable = recipes
    .filter(r => !getMatch(r).unmakable)
    .sort((a, b) => getMatch(b).pct - getMatch(a).pct)
  const unmakable = recipes.filter(r => getMatch(r).unmakable)

  return (
    <div>
      {!showForm && (
        <button onClick={() => setShowForm(true)} className={styles.newBtn}>
          + New recipe
        </button>
      )}

      {showForm && (
        <AddRecipeForm ingredients={ingredients} onSave={handleSave} onCancel={() => setShowForm(false)} />
      )}

      {recipes.length === 0 && !showForm && (
        <p className={styles.empty}>No recipes yet. Add your first one above.</p>
      )}

      {makable.map(r => (
        <RecipeCard key={r.id} recipe={r} match={getMatch(r)} ingredients={ingredients} onDelete={removeRecipe} onUpdateIngs={updateRecipeIngs} />
      ))}

      {unmakable.length > 0 && (
        <>
          <p className={styles.sectionLabel}>Unmakable</p>
          {unmakable.map(r => (
            <RecipeCard key={r.id} recipe={r} match={getMatch(r)} ingredients={ingredients} onDelete={removeRecipe} onUpdateIngs={updateRecipeIngs} />
          ))}
        </>
      )}
    </div>
  )
}