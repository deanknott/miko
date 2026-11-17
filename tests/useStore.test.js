// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { api } from '../src/apiClient.js'
import { useStore } from '../src/useStore.js'

vi.mock('../src/apiClient.js', () => ({ api: vi.fn() }))

function ingredient(name, checked) {
  return { name, checked, categoryId: null }
}

function recipe(id, name, ings) {
  return { id, name, ings: ings.map(i => (typeof i === 'string' ? { name: i, essential: false } : i)) }
}

// Pantry: pasta and tomato in stock, basil and chicken not.
const PANTRY = [
  ingredient('pasta', true),
  ingredient('tomato', true),
  ingredient('basil', false),
  ingredient('chicken', false),
]

const RECIPES = [
  recipe(1, 'Tomato Pasta', ['pasta', 'tomato', 'basil']),                        // 2 of 3 -> 67%
  recipe(2, 'Plain Pasta', ['pasta']),                                            // 1 of 1 -> 100%
  recipe(3, 'Chicken Pasta', [{ name: 'chicken', essential: true }, 'pasta']),   // missing an essential -> unmakable
  recipe(4, 'Basil Salad', ['basil', 'tomato']),                                  // 1 of 2 -> 50%
]

async function renderStore({ ingredients = PANTRY, recipes = RECIPES, mealPlan = [] } = {}) {
  api.mockResolvedValueOnce({ ingredients, categories: [], recipes, mealPlan })
  const { result } = renderHook(() => useStore())
  await waitFor(() => expect(result.current.loading).toBe(false))
  return result
}

beforeEach(() => {
  api.mockReset()
})

describe('getMatch', () => {
  it('scores a recipe by the share of its ingredients in stock', async () => {
    const store = await renderStore()
    const match = store.current.getMatch(RECIPES[0])
    expect(match.pct).toBe(67)
    expect(match.have).toEqual(['pasta', 'tomato'])
    expect(match.missing).toEqual(['basil'])
    expect(match.unmakable).toBe(false)
  })

  it('marks a recipe unmakable when an essential ingredient is missing', async () => {
    const store = await renderStore()
    const match = store.current.getMatch(RECIPES[2])
    expect(match.unmakable).toBe(true)
    expect(match.pct).toBe(50)
  })

  it('scores a recipe with no ingredients as 0% rather than dividing by zero', async () => {
    const store = await renderStore()
    expect(store.current.getMatch(recipe(9, 'Empty', [])).pct).toBe(0)
  })
})

describe('getSortedRecipes', () => {
  it('ranks makable recipes from best to worst match', async () => {
    const store = await renderStore()
    const names = store.current.getSortedRecipes().map(r => r.name)
    expect(names).toEqual(['Plain Pasta', 'Tomato Pasta', 'Basil Salad'])
  })

  it('leaves out unmakable recipes', async () => {
    const store = await renderStore()
    const names = store.current.getSortedRecipes().map(r => r.name)
    expect(names).not.toContain('Chicken Pasta')
  })

  it('leaves out skipped recipes so "Show another" moves on', async () => {
    const store = await renderStore()
    const names = store.current.getSortedRecipes(new Set([2])).map(r => r.name)
    expect(names).toEqual(['Tomato Pasta', 'Basil Salad'])
  })

  it('ranks everything at 0% when the pantry is empty', async () => {
    const emptyPantry = PANTRY.map(i => ({ ...i, checked: false }))
    const store = await renderStore({ ingredients: emptyPantry })
    const sorted = store.current.getSortedRecipes()
    expect(sorted.every(r => r.pct === 0)).toBe(true)
    expect(sorted.map(r => r.name)).not.toContain('Chicken Pasta')
  })
})

describe('getShoppingList', () => {
  it('is empty when nothing is planned', async () => {
    const store = await renderStore()
    expect(store.current.getShoppingList()).toEqual([])
  })

  it('lists only the planned ingredients not already in stock', async () => {
    const store = await renderStore({
      mealPlan: [{ id: 1, dayOfWeek: 'monday', recipeId: 1 }],
    })
    expect(store.current.getShoppingList()).toEqual([
      { name: 'basil', neededFor: ['Tomato Pasta'] },
    ])
  })

  it('combines an ingredient needed by several recipes into one line', async () => {
    const store = await renderStore({
      mealPlan: [
        { id: 1, dayOfWeek: 'monday', recipeId: 1 },
        { id: 2, dayOfWeek: 'tuesday', recipeId: 4 },
        { id: 3, dayOfWeek: 'wednesday', recipeId: 1 },
      ],
    })
    expect(store.current.getShoppingList()).toEqual([
      { name: 'basil', neededFor: ['Basil Salad', 'Tomato Pasta'] },
    ])
  })

  it('sorts the list alphabetically', async () => {
    const store = await renderStore({
      mealPlan: [
        { id: 1, dayOfWeek: 'monday', recipeId: 3 },
        { id: 2, dayOfWeek: 'tuesday', recipeId: 4 },
      ],
    })
    expect(store.current.getShoppingList().map(i => i.name)).toEqual(['basil', 'chicken'])
  })

  it('drops an item once it is ticked off', async () => {
    const store = await renderStore({
      mealPlan: [{ id: 1, dayOfWeek: 'monday', recipeId: 1 }],
    })
    api.mockResolvedValueOnce({ ok: true })
    await act(() => store.current.toggleIngredient('basil'))
    expect(store.current.getShoppingList()).toEqual([])
  })

  it('puts the item back if saving the tick fails', async () => {
    const store = await renderStore({
      mealPlan: [{ id: 1, dayOfWeek: 'monday', recipeId: 1 }],
    })
    api.mockRejectedValueOnce(new Error('network down'))
    await act(() => store.current.toggleIngredient('basil'))
    expect(store.current.getShoppingList().map(i => i.name)).toEqual(['basil'])
    expect(store.current.error).toBe('Failed to update ingredient.')
  })
})
