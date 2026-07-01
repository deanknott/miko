import { useState, useEffect } from 'react'
import { loadIngredients, saveIngredients, loadRecipes, saveRecipes } from './storage.js'

const DEFAULT_INGREDIENTS = [
  'eggs', 'butter', 'onion', 'garlic', 'pasta', 'pepper', 'mushroom',
  'cheese', 'halloumi', 'paneer', 'taco shells', 'mince',
  'waffles', 'beans', 'cous cous', 'curry sauce', 'chip shop curry sauce',
  'lasagna sheets', 'lasagna red sauce', 'lasagna white sauce', 'honey', 'parsnips',
  'carrots', 'seitan', 'bang bang', 'corn flour', 'crumbs', 'soy sauce', 'hoisin', 'xiou xing',
  'brown sugar', 'five spice', 'ginger', 'rice', 'wraps', 'fajita seasoning', 'cream cheese',
  'hot chilli sauce', 'mac and cheese', 'feta', 'pasta bake sauce', 'roasties', 'gravy',
  'enchilada kit',
].map(name => ({ name, checked: true }))

const DEFAULT_RECIPES = [
  { id: 1,  name: 'Halloumi curry',      ings: [{ name: 'rice', essential: true }, { name: 'curry sauce', essential: true }, { name: 'halloumi', essential: false }, { name: 'onion', essential: false }, { name: 'pepper', essential: false }, { name: 'mushroom', essential: false }] },
  { id: 2,  name: 'Paneer curry',        ings: [{ name: 'rice', essential: true }, { name: 'curry sauce', essential: true }, { name: 'paneer', essential: false }, { name: 'onion', essential: false }, { name: 'pepper', essential: false }, { name: 'mushroom', essential: false }] },
  { id: 3,  name: 'Tacos',              ings: [{ name: 'taco shells', essential: true }, { name: 'mince', essential: true }, { name: 'hot chilli sauce', essential: false }, { name: 'mac and cheese', essential: false }, { name: 'onion', essential: false }, { name: 'pepper', essential: false }, { name: 'mushroom', essential: false }] },
  { id: 4,  name: 'Breakfast tea',      ings: [{ name: 'waffles', essential: true }, { name: 'eggs', essential: true }, { name: 'beans', essential: false }, { name: 'cheese', essential: false }] },
  { id: 5,  name: 'Halloumi cous cous', ings: [{ name: 'cous cous', essential: true }, { name: 'halloumi', essential: true }, { name: 'mushroom', essential: false }, { name: 'pepper', essential: false }, { name: 'onion', essential: false }] },
  { id: 6,  name: 'Feta cous cous',     ings: [{ name: 'cous cous', essential: true }, { name: 'feta', essential: true }, { name: 'mushroom', essential: false }, { name: 'pepper', essential: false }, { name: 'onion', essential: false }] },
  { id: 7,  name: 'Pasta bake',         ings: [{ name: 'pasta', essential: true }, { name: 'pasta bake sauce', essential: true }, { name: 'cheese', essential: false }] },
  { id: 8,  name: 'Lasagna',            ings: [{ name: 'mince', essential: true }, { name: 'lasagna sheets', essential: true }, { name: 'lasagna red sauce', essential: true }, { name: 'lasagna white sauce', essential: true }, { name: 'cheese', essential: false }] },
  { id: 9,  name: 'Honey roast',        ings: [{ name: 'carrots', essential: true }, { name: 'parsnips', essential: true }, { name: 'honey', essential: true }, { name: 'roasties', essential: true }, { name: 'gravy', essential: true }, { name: 'onion', essential: false }, { name: 'pepper', essential: false }, { name: 'halloumi', essential: false }, { name: 'garlic', essential: false }] },
  { id: 10, name: 'Bang bang',          ings: [{ name: 'bang bang', essential: true }, { name: 'seitan', essential: true }, { name: 'rice', essential: true }, { name: 'corn flour', essential: false }, { name: 'crumbs', essential: false }] },
  { id: 11, name: 'BBQ sauce',          ings: [{ name: 'hoisin', essential: true }, { name: 'soy sauce', essential: true }, { name: 'xiou xing', essential: true }, { name: 'ginger', essential: false }, { name: 'honey', essential: false }, { name: 'brown sugar', essential: false }, { name: 'five spice', essential: false }, { name: 'garlic', essential: false }] },
  { id: 12, name: 'Halloumi fried rice',ings: [{ name: 'rice', essential: true }, { name: 'eggs', essential: true }, { name: 'chip shop curry sauce', essential: true }, { name: 'halloumi', essential: false }, { name: 'mushroom', essential: false }, { name: 'pepper', essential: false }, { name: 'onion', essential: false }] },
  { id: 13, name: 'Seitan fried rice',  ings: [{ name: 'rice', essential: true }, { name: 'eggs', essential: true }, { name: 'chip shop curry sauce', essential: true }, { name: 'seitan', essential: false }, { name: 'mushroom', essential: false }, { name: 'pepper', essential: false }, { name: 'onion', essential: false }] },
  { id: 14, name: 'Enchiladas',         ings: [{ name: 'enchilada kit', essential: true }, { name: 'halloumi', essential: true }, { name: 'mushroom', essential: false }, { name: 'pepper', essential: false }, { name: 'onion', essential: false }] },
  { id: 15, name: 'Seitan fajitas',     ings: [{ name: 'wraps', essential: true }, { name: 'seitan', essential: true }, { name: 'fajita seasoning', essential: true }, { name: 'mushroom', essential: false }, { name: 'pepper', essential: false }, { name: 'onion', essential: false }] },
  { id: 16, name: 'Halloumi fajitas',   ings: [{ name: 'wraps', essential: true }, { name: 'halloumi', essential: true }, { name: 'fajita seasoning', essential: true }, { name: 'mushroom', essential: false }, { name: 'pepper', essential: false }, { name: 'onion', essential: false }] },
]

export function useStore() {
  const [ingredients, setIngredients] = useState(() => loadIngredients(DEFAULT_INGREDIENTS))
  const [recipes, setRecipes] = useState(() => loadRecipes(DEFAULT_RECIPES))
  const [nextId, setNextId] = useState(() => {
    const ids = recipes.map(r => r.id)
    return ids.length ? Math.max(...ids) + 1 : 1
  })

  useEffect(() => saveIngredients(ingredients), [ingredients])
  useEffect(() => saveRecipes(recipes), [recipes])

  function addIngredient(name) {
    const val = name.trim().toLowerCase()
    if (!val || ingredients.some(i => i.name === val)) return false
    setIngredients(prev => [...prev, { name: val, checked: true }])
    return true
  }

  function removeIngredient(name) {
    setIngredients(prev => prev.filter(i => i.name !== name))
  }

  function toggleIngredient(name) {
    setIngredients(prev =>
      prev.map(i => i.name === name ? { ...i, checked: !i.checked } : i)
    )
  }

  function addRecipe(name, ings) {
    const recipe = { id: nextId, name: name.trim(), ings }
    setRecipes(prev => [...prev, recipe])
    setNextId(n => n + 1)
    return recipe
  }

  function removeRecipe(id) {
    setRecipes(prev => prev.filter(r => r.id !== id))
  }

  function updateRecipeIngs(id, ings) {
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, ings } : r))
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
    addIngredient,
    removeIngredient,
    toggleIngredient,
    addRecipe,
    removeRecipe,
    updateRecipeIngs,
    getMatch,
    getSortedRecipes,
  }
}