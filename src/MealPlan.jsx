import { useState } from 'react'
import styles from './MealPlan.module.css'

const DAYS = [
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
  { id: 'saturday', label: 'Saturday' },
  { id: 'sunday', label: 'Sunday' },
]

function DaySection({ day, entries, recipes, onAdd, onRemove }) {
  const [selectedRecipeId, setSelectedRecipeId] = useState('')

  function handleAdd() {
    if (!selectedRecipeId) return
    onAdd(day.id, Number(selectedRecipeId))
    setSelectedRecipeId('')
  }

  return (
    <div className={styles.day}>
      <p className={styles.dayName}>{day.label}</p>

      {entries.length === 0 ? (
        <p className={styles.dayEmpty}>Nothing planned</p>
      ) : (
        <ul className={styles.list}>
          {entries.map(entry => {
            const recipe = recipes.find(r => r.id === entry.recipeId)
            const recipeName = recipe ? recipe.name : 'Unknown recipe'
            return (
              <li key={entry.id} className={styles.entry}>
                <span>{recipeName}</span>
                <button
                  onClick={() => onRemove(entry.id)}
                  className={styles.removeBtn}
                  aria-label={`Remove ${recipeName} from ${day.label}`}
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className={styles.addRow}>
        <select
          value={selectedRecipeId}
          onChange={e => setSelectedRecipeId(e.target.value)}
          className={styles.select}
          aria-label={`Add a recipe to ${day.label}`}
        >
          <option value="">Add a recipe…</option>
          {recipes.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <button onClick={handleAdd} className={styles.addBtn} disabled={!selectedRecipeId}>Add</button>
      </div>
    </div>
  )
}

export default function MealPlan({ mealPlan, recipes, addMealPlanEntry, removeMealPlanEntry }) {
  if (recipes.length === 0) {
    return <p className={styles.empty}>No recipes yet. Add some on the Recipes tab first, then plan your week here.</p>
  }

  return (
    <div>
      {DAYS.map(day => (
        <DaySection
          key={day.id}
          day={day}
          entries={mealPlan.filter(e => e.dayOfWeek === day.id)}
          recipes={recipes}
          onAdd={addMealPlanEntry}
          onRemove={removeMealPlanEntry}
        />
      ))}
    </div>
  )
}
