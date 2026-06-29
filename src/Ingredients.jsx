import { useState } from 'react'
import styles from './Ingredients.module.css'

export default function Ingredients({ ingredients, addIngredient, removeIngredient }) {
  const [input, setInput] = useState('')

  function handleAdd() {
    if (addIngredient(input)) setInput('')
  }

  function handleKey(e) {
    if (e.key === 'Enter') handleAdd()
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.addRow}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Add an ingredient (e.g. eggs)"
          className={styles.input}
        />
        <button onClick={handleAdd} className={styles.addBtn}>Add</button>
      </div>

      <p className={styles.count}>
        {ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''}
      </p>

      {ingredients.length === 0 ? (
        <p className={styles.empty}>No ingredients yet. Add what's in your kitchen.</p>
      ) : (
        <div className={styles.chipGrid}>
          {ingredients.map(ing => (
            <div key={ing} className={styles.chip}>
              <span>{ing}</span>
              <button
                onClick={() => removeIngredient(ing)}
                className={styles.chipRemove}
                aria-label={`Remove ${ing}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
