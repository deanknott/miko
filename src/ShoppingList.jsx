import styles from './ShoppingList.module.css'

export default function ShoppingList({ mealPlan, shoppingList, toggleIngredient }) {
  if (mealPlan.length === 0) {
    return <p className={styles.empty}>Nothing planned yet. Add recipes to your Meal Plan tab to generate a shopping list.</p>
  }

  if (shoppingList.length === 0) {
    return <p className={styles.empty}>You have everything you need for your planned meals.</p>
  }

  return (
    <ul className={styles.list}>
      {shoppingList.map(item => (
        <li key={item.name} className={styles.row}>
          <label className={styles.label}>
            <input
              type="checkbox"
              checked={false}
              onChange={() => toggleIngredient(item.name)}
              className={styles.checkbox}
            />
            <span className={styles.itemName}>{item.name}</span>
          </label>
          <span className={styles.neededFor}>for {item.neededFor.join(', ')}</span>
        </li>
      ))}
    </ul>
  )
}
