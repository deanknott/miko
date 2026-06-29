import { useState } from 'react'
import { useStore } from './useStore.js'
import Ingredients from './Ingredients.jsx'
import Recipes from './Recipes.jsx'
import Suggest from './Suggest.jsx'
import styles from './App.module.css'

const TABS = [
  { id: 'ingredients', label: 'Ingredients' },
  { id: 'recipes', label: 'Recipes' },
  { id: 'suggest', label: "Tonight's pick" },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('ingredients')
  const store = useStore()

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <span className={styles.wordmark}>miko</span>
        <span className={styles.tagline}>what should I cook?</span>
      </header>

      <nav className={styles.tabs} role="tablist">
        {TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className={styles.content} role="tabpanel">
        {activeTab === 'ingredients' && (
          <Ingredients
            ingredients={store.ingredients}
            addIngredient={store.addIngredient}
            removeIngredient={store.removeIngredient}
            toggleIngredient={store.toggleIngredient}
          />
        )}
        {activeTab === 'recipes' && (
          <Recipes
            recipes={store.recipes}
            getMatch={store.getMatch}
            addRecipe={store.addRecipe}
            removeRecipe={store.removeRecipe}
            updateRecipeIngs={store.updateRecipeIngs}
          />
        )}
        {activeTab === 'suggest' && (
          <Suggest
            getSortedRecipes={store.getSortedRecipes}
            recipes={store.recipes}
          />
        )}
      </main>
    </div>
  )
}