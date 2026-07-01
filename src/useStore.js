import { useState, useEffect } from 'react'
import { api } from './apiClient.js'

export function useStore() {
  const [ingredients, setIngredients] = useState([])
  const [recipes, setRecipes] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api('/api/state')
      .then(data => {
        setIngredients(data.ingredients)
        setCategories(data.categories)
        setRecipes(data.recipes)
      })
      .catch(() => setError('Failed to load data from the server.'))
      .finally(() => setLoading(false))
  }, [])

  async function addIngredient(name) {
    const val = name.trim().toLowerCase()
    if (!val || ingredients.some(i => i.name === val)) return false
    setIngredients(prev => [...prev, { name: val, checked: true, categoryId: null }])
    try {
      await api('/api/ingredients', { method: 'POST', body: JSON.stringify({ name: val }) })
      return true
    } catch {
      setIngredients(prev => prev.filter(i => i.name !== val))
      setError('Failed to add ingredient.')
      return false
    }
  }

  async function removeIngredient(name) {
    const prev = ingredients
    setIngredients(list => list.filter(i => i.name !== name))
    try {
      await api(`/api/ingredients?name=${encodeURIComponent(name)}`, { method: 'DELETE' })
    } catch {
      setIngredients(prev)
      setError('Failed to remove ingredient.')
    }
  }

  async function toggleIngredient(name) {
    const target = ingredients.find(i => i.name === name)
    if (!target) return
    const nextChecked = !target.checked
    setIngredients(prev => prev.map(i => i.name === name ? { ...i, checked: nextChecked } : i))
    try {
      await api('/api/ingredients', { method: 'PATCH', body: JSON.stringify({ name, checked: nextChecked }) })
    } catch {
      setIngredients(prev => prev.map(i => i.name === name ? { ...i, checked: !nextChecked } : i))
      setError('Failed to update ingredient.')
    }
  }

  async function setIngredientCategory(name, categoryId) {
    const prev = ingredients
    setIngredients(list => list.map(i => i.name === name ? { ...i, categoryId } : i))
    try {
      await api('/api/ingredients', { method: 'PATCH', body: JSON.stringify({ name, categoryId }) })
    } catch {
      setIngredients(prev)
      setError('Failed to move ingredient.')
    }
  }

  async function addCategory(name) {
    const val = name.trim()
    if (!val || categories.some(c => c.name.toLowerCase() === val.toLowerCase())) return false
    try {
      const created = await api('/api/categories', { method: 'POST', body: JSON.stringify({ name: val }) })
      setCategories(prev => [...prev, created])
      return true
    } catch {
      setError('Failed to add category.')
      return false
    }
  }

  async function renameCategory(id, name) {
    const val = name.trim()
    if (!val) return false
    const prev = categories
    setCategories(list => list.map(c => c.id === id ? { ...c, name: val } : c))
    try {
      await api('/api/categories', { method: 'PATCH', body: JSON.stringify({ id, name: val }) })
      return true
    } catch {
      setCategories(prev)
      setError('Failed to rename category.')
      return false
    }
  }

  async function removeCategory(id) {
    const prevCategories = categories
    const prevIngredients = ingredients
    setCategories(list => list.filter(c => c.id !== id))
    setIngredients(list => list.map(i => i.categoryId === id ? { ...i, categoryId: null } : i))
    try {
      await api(`/api/categories?id=${id}`, { method: 'DELETE' })
    } catch {
      setCategories(prevCategories)
      setIngredients(prevIngredients)
      setError('Failed to delete category.')
    }
  }

  async function addRecipe(name, ings) {
    try {
      const created = await api('/api/recipes', { method: 'POST', body: JSON.stringify({ name: name.trim(), ings }) })
      setRecipes(prev => [...prev, created])
      return created
    } catch {
      setError('Failed to add recipe.')
      return null
    }
  }

  async function removeRecipe(id) {
    const prev = recipes
    setRecipes(list => list.filter(r => r.id !== id))
    try {
      await api(`/api/recipes?id=${id}`, { method: 'DELETE' })
    } catch {
      setRecipes(prev)
      setError('Failed to delete recipe.')
    }
  }

  async function updateRecipeIngs(id, ings) {
    const prev = recipes
    setRecipes(list => list.map(r => r.id === id ? { ...r, ings } : r))
    try {
      await api('/api/recipes', { method: 'PATCH', body: JSON.stringify({ id, ings }) })
    } catch {
      setRecipes(prev)
      setError('Failed to update recipe.')
    }
  }

  function getMatch(recipe) {
    const checkedNames = ingredients.filter(i => i.checked).map(i => i.name)
    const ingNames = recipe.ings.map(i => i.name)
    const have = ingNames.filter(n => checkedNames.includes(n))
    const missing = ingNames.filter(n => !checkedNames.includes(n))
    const unmakable = recipe.ings.some(i => i.essential && !checkedNames.includes(i.name))
    const pct = ingNames.length === 0 ? 0 : Math.round((have.length / ingNames.length) * 100)
    return { have, missing, pct, unmakable }
  }

  function getSortedRecipes(skipSet = new Set()) {
    return recipes
      .filter(r => !skipSet.has(r.id))
      .map(r => ({ ...r, ...getMatch(r) }))
      .filter(r => !r.unmakable)
      .sort((a, b) => b.pct - a.pct)
  }

  return {
    ingredients,
    recipes,
    categories,
    loading,
    error,
    clearError: () => setError(null),
    addIngredient,
    removeIngredient,
    toggleIngredient,
    setIngredientCategory,
    addCategory,
    renameCategory,
    removeCategory,
    addRecipe,
    removeRecipe,
    updateRecipeIngs,
    getMatch,
    getSortedRecipes,
  }
}
