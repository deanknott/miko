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

export default function MainApp({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('ingredients')
  const store = useStore()

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <span className={styles.wordmark}>miko</span>
        <span className={styles.tagline}>what should I cook?</span>
        <div className={styles.headerRight}>
          <span className={styles.userEmail}>{user.email}</span>
          <button onClick={onLogout} className={styles.logoutBtn}>Log out</button>
        </div>
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

      {store.error && (
        <div className={styles.errorBanner}>
          {store.error}
          <button onClick={store.clearError} className={styles.errorDismiss} aria-label="Dismiss error">×</button>
        </div>
      )}

      <main className={styles.content} role="tabpanel">
        {store.loading ? (
          <p className={styles.loading}>Loading…</p>
        ) : (
        <>
        {activeTab === 'ingredients' && (
          <Ingredients
            ingredients={store.ingredients}
            categories={store.categories}
            addIngredient={store.addIngredient}
            removeIngredient={store.removeIngredient}
            toggleIngredient={store.toggleIngredient}
            setIngredientCategory={store.setIngredientCategory}
            addCategory={store.addCategory}
            renameCategory={store.renameCategory}
            removeCategory={store.removeCategory}
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
        </>
        )}
      </main>
    </div>
  )
}
