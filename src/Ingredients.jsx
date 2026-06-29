import { useState } from 'react'
import styles from './Ingredients.module.css'

export default function Ingredients({ ingredients, addIngredient, removeIngredient, toggleIngredient }) {
  const [input, setInput] = useState('')

  function handleAdd() {
    if (addIngredient(input)) setInput('')
  }

  function handleKey(e) {
    if (e.key === 'Enter') handleAdd()
  }

  const checkedCount = ingredients.filter(i => i.checked).length

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
        {checkedCount} of {ingredients.length} in stock
      </p>

      {ingredients.length === 0 ? (
        <p className={styles.empty}>No ingredients yet. Add what's in your kitchen.</p>
      ) : (
        <ul className={styles.list}>
          {ingredients.map(ing => (
            <li key={ing.name} className={`${styles.row} ${!ing.checked ? styles.rowUnchecked : ''}`}>
              <label className={styles.label}>
                <input
                  type="checkbox"
                  checked={ing.checked}
                  onChange={() => toggleIngredient(ing.name)}
                  className={styles.checkbox}
                />
                <span className={styles.ingName}>{ing.name}</span>
              </label>
              <button
                onClick={() => removeIngredient(ing.name)}
                className={styles.deleteBtn}
                aria-label={`Remove ${ing.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}