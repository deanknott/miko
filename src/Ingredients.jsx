import { useState } from 'react'
import {
  DndContext, closestCenter, useDraggable, useDroppable,
  useSensor, useSensors, PointerSensor, TouchSensor,
} from '@dnd-kit/core'
import styles from './Ingredients.module.css'

const HOLD_DELAY_MS = 200
const HOLD_TOLERANCE_PX = 5

function byCheckedThenName(a, b) {
  if (a.checked !== b.checked) return a.checked ? -1 : 1
  return a.name.localeCompare(b.name)
}

function IngredientRow({ ing, toggleIngredient, removeIngredient }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: `ing:${ing.name}` })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      aria-roledescription={`Draggable ingredient, ${ing.name}`}
      className={`${styles.row} ${!ing.checked ? styles.rowUnchecked : ''} ${isDragging ? styles.rowDragging : ''}`}
    >
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
        onPointerDown={e => e.stopPropagation()}
        onClick={() => removeIngredient(ing.name)}
        className={styles.deleteBtn}
        aria-label={`Remove ${ing.name}`}
      >
        ×
      </button>
    </li>
  )
}

function CategorySection({ category, ingredients, toggleIngredient, removeIngredient, onRename, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(category?.name ?? '')
  const { setNodeRef, isOver } = useDroppable({ id: category ? `cat:${category.id}` : 'cat:uncategorized' })

  function handleRename() {
    if (onRename(category.id, name)) setEditing(false)
    else setName(category.name)
  }

  return (
    <div ref={setNodeRef} className={`${styles.category} ${isOver ? styles.categoryOver : ''}`}>
      <div className={styles.categoryHeader}>
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRename()}
            onBlur={handleRename}
            className={styles.categoryNameInput}
          />
        ) : (
          <span className={styles.categoryName}>{category ? category.name : 'Uncategorized'}</span>
        )}
        {category && (
          <div className={styles.categoryActions}>
            <button
              onClick={() => setEditing(e => !e)}
              className={`${styles.editBtn} ${editing ? styles.editBtnActive : ''}`}
              aria-label={`Rename ${category.name}`}
            >
              edit
            </button>
            <button
              onClick={() => onRemove(category.id)}
              className={styles.categoryDeleteBtn}
              aria-label={`Delete category ${category.name}`}
            >
              ×
            </button>
          </div>
        )}
      </div>

      {ingredients.length === 0 ? (
        <p className={styles.categoryEmpty}>Drag ingredients here</p>
      ) : (
        <ul className={styles.list}>
          {ingredients.map(ing => (
            <IngredientRow
              key={ing.name}
              ing={ing}
              toggleIngredient={toggleIngredient}
              removeIngredient={removeIngredient}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Ingredients({
  ingredients, categories,
  addIngredient, removeIngredient, toggleIngredient,
  setIngredientCategory, addCategory, renameCategory, removeCategory,
}) {
  const [input, setInput] = useState('')
  const [categoryInput, setCategoryInput] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: HOLD_DELAY_MS, tolerance: HOLD_TOLERANCE_PX },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: HOLD_DELAY_MS, tolerance: HOLD_TOLERANCE_PX },
    }),
  )

  function handleAdd() {
    if (addIngredient(input)) setInput('')
  }

  function handleAddCategory() {
    if (addCategory(categoryInput)) setCategoryInput('')
  }

  function handleDragEnd({ active, over }) {
    if (!over) return
    const name = active.id.replace(/^ing:/, '')
    const categoryId = over.id === 'cat:uncategorized' ? null : Number(over.id.replace(/^cat:/, ''))
    setIngredientCategory(name, categoryId)
  }

  const checkedCount = ingredients.filter(i => i.checked).length

  return (
    <div className={styles.wrap}>
      <div className={styles.addRow}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Add an ingredient (e.g. eggs)"
          className={styles.input}
        />
        <button onClick={handleAdd} className={styles.addBtn}>Add</button>
      </div>

      <div className={styles.addRow}>
        <input
          type="text"
          value={categoryInput}
          onChange={e => setCategoryInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
          placeholder="Add a category (e.g. Produce)"
          className={styles.input}
        />
        <button onClick={handleAddCategory} className={styles.addBtn}>Add category</button>
      </div>

      <p className={styles.count}>
        {checkedCount} of {ingredients.length} in stock
      </p>

      {ingredients.length === 0 ? (
        <p className={styles.empty}>No ingredients yet. Add what's in your kitchen.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map(category => (
            <CategorySection
              key={category.id}
              category={category}
              ingredients={ingredients.filter(i => i.categoryId === category.id).sort(byCheckedThenName)}
              toggleIngredient={toggleIngredient}
              removeIngredient={removeIngredient}
              onRename={renameCategory}
              onRemove={removeCategory}
            />
          ))}
          <CategorySection
            category={null}
            ingredients={ingredients.filter(i => i.categoryId == null).sort(byCheckedThenName)}
            toggleIngredient={toggleIngredient}
            removeIngredient={removeIngredient}
          />
        </DndContext>
      )}
    </div>
  )
}
