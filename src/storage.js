const PREFIX = 'miko'

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(`${PREFIX}:${key}`)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function save(key, value) {
  try {
    localStorage.setItem(`${PREFIX}:${key}`, JSON.stringify(value))
  } catch {
    // localStorage unavailable (private mode / quota exceeded) — state stays in-memory only
  }
}

export function loadIngredients(fallback) {
  return load('ingredients', fallback)
}

export function saveIngredients(ingredients) {
  save('ingredients', ingredients)
}

export function loadRecipes(fallback) {
  return load('recipes', fallback)
}

export function saveRecipes(recipes) {
  save('recipes', recipes)
}

export function loadCategories(fallback) {
  return load('categories', fallback)
}

export function saveCategories(categories) {
  save('categories', categories)
}
