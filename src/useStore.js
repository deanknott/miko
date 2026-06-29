import { useState } from 'react'

const DEFAULT_INGREDIENTS = [
  'eggs', 'butter', 'onion', 'garlic', 'pasta', 'pepper', 'mushroom',
  'cheese', 'halloumi', 'paneer', 'taco shells', 'mince', 
  'waffles', 'beans', 'cous cous', 'curry sauce', 'chip shop curry sauce', 
  'lasagna sheets', 'lasagna red sauce', 'lasagna white sauce', 'honey', 'parsnips',
  'carrots', 'seitan', 'bang bang', 'corn flour', 'crumbs', 'soy sauce', 'hoisin', 'xiou xing',
  'brown sugar', 'five spice', 'ginger', 'rice', 'wraps', 'fajita seasoning', 'cream cheese',
  'hot chilli sauce', 'mac and cheese', 'feta', 'pasta bake sauce', 'roasties', 'gravy',
  'enchilada kit',
]

const DEFAULT_RECIPES = [
  { id: 1, name: 'Halloumi curry', ings: ['rice', 'halloumi', 'onion', 'pepper', 'mushroom', 'curry sauce'] },
  { id: 2, name: 'Paneer curry', ings: ['rice', 'paneer', 'onion', 'pepper', 'mushroom', 'curry sauce'] },
  { id: 3, name: 'Tacos', ings: ['mince', 'taco shells', 'hot chilli sauce', 'mac and cheese', 'onion', 'pepper', 'mushroom'] },
  { id: 4, name: 'Breakfast tea', ings: ['waffles', 'eggs', 'beans', 'cheese'] },
  { id: 5, name: 'Halloumi cous cous', ings: ['cous cous', 'halloumi', 'mushroom', 'pepper', 'onion'] },
  { id: 6, name: 'Feta cous cous', ings: ['cous cous', 'feta', 'mushroom', 'pepper', 'onion'] },
  { id: 7, name: 'Pasta bake', ings: ['pasta', 'pasta bake sauce', 'cheese'] },
  { id: 8, name: 'Lasagna', ings: ['mince', 'lasagna sheets', 'lasagna red sauce', 'lasagna white sauce', 'cheese'] },
  { id: 9, name: 'Honey roast', ings: ['carrots', 'parsnips', 'onion', 'pepper', 'halloumi', 'honey', 'garlic', 'roasties', 'gravy'] },
  { id: 10, name: 'Bang bang', ings: ['bang bang', 'seitan', 'corn flour', 'crumbs', 'rice'] },
  { id: 11, name: 'BBQ sauce', ings: ['hoisin', 'soy sauce', 'xiou xing', 'ginger', 'honey', 'brown sugar', 'five spice', 'garlic'] },
  { id: 12, name: 'Halloumi fried rice', ings: ['rice', 'eggs', 'mushroom', 'pepper', 'onion', 'halloumi', 'chip shop curry sauce'] },
  { id: 13, name: 'Seitan fried rice', ings: ['rice', 'eggs', 'mushroom', 'pepper', 'onion', 'seitan', 'chip shop curry sauce'] },
  { id: 14, name: 'Enchiladas', ings: ['enchilada kit', 'mushroom', 'pepper', 'onion', 'halloumi'] },
  { id: 15, name: 'Seitan fajitas', ings: ['wraps', 'seitan', 'mushroom', 'pepper', 'onion', 'fajita seasoning'] },
  { id: 16, name: 'Halloumi fajitas', ings: ['wraps', 'halloumi', 'mushroom', 'pepper', 'onion', 'fajita seasoning'] },

]

export function useStore() {
  const [ingredients, setIngredients] = useState(DEFAULT_INGREDIENTS)
  const [recipes, setRecipes] = useState(DEFAULT_RECIPES)
  const [nextId, setNextId] = useState(17)

  function addIngredient(name) {
    const val = name.trim().toLowerCase()
    if (!val || ingredients.includes(val)) return false
    setIngredients(prev => [...prev, val])
    return true
  }

  function removeIngredient(name) {
    setIngredients(prev => prev.filter(i => i !== name))
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

  function getMatch(recipe) {
    const have = recipe.ings.filter(i => ingredients.includes(i))
    const missing = recipe.ings.filter(i => !ingredients.includes(i))
    const pct = recipe.ings.length === 0 ? 0 : Math.round((have.length / recipe.ings.length) * 100)
    return { have, missing, pct }
  }

  function getSortedRecipes(skipSet = new Set()) {
    return recipes
      .filter(r => !skipSet.has(r.id))
      .map(r => ({ ...r, ...getMatch(r) }))
      .sort((a, b) => b.pct - a.pct)
  }

  return {
    ingredients,
    recipes,
    addIngredient,
    removeIngredient,
    addRecipe,
    removeRecipe,
    getMatch,
    getSortedRecipes,
  }
}
