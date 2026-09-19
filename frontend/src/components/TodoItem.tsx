import { useEffect, useRef, useState } from 'react'
import type { Todo } from '../types'

type TodoItemProps = {
  todo: Todo
  busy: boolean
  onToggle: (todo: Todo) => void
  onRename: (todo: Todo, title: string) => Promise<void>
  onDelete: (todo: Todo) => void
}

export function TodoItem({
  todo,
  busy,
  onToggle,
  onRename,
  onDelete,
}: TodoItemProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(todo.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function startEditing() {
    setDraft(todo.title)
    setEditing(true)
  }

  async function commit() {
    const next = draft.trim()
    if (!next || next === todo.title) {
      setDraft(todo.title)
      setEditing(false)
      return
    }

    await onRename(todo, next)
    setEditing(false)
  }

  return (
    <li className={`todo-item${todo.completed ? ' is-done' : ''}`}>
      <label className="todo-check">
        <input
          type="checkbox"
          checked={todo.completed}
          disabled={busy}
          onChange={() => onToggle(todo)}
          aria-label={todo.completed ? 'Mark as active' : 'Mark as done'}
        />
        <span aria-hidden="true" />
      </label>

      {editing ? (
        <form
          className="todo-edit"
          onSubmit={(event) => {
            event.preventDefault()
            void commit()
          }}
        >
          <input
            ref={inputRef}
            value={draft}
            maxLength={255}
            disabled={busy}
            aria-label="Edit task"
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => void commit()}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setDraft(todo.title)
                setEditing(false)
              }
            }}
          />
        </form>
      ) : (
        <button
          type="button"
          className="todo-title"
          onDoubleClick={startEditing}
        >
          {todo.title}
        </button>
      )}

      <div className="todo-actions">
        {!editing && (
          <button
            type="button"
            className="ghost"
            onClick={startEditing}
            disabled={busy}
          >
            Edit
          </button>
        )}
        <button
          type="button"
          className="ghost danger"
          onClick={() => onDelete(todo)}
          disabled={busy}
        >
          Delete
        </button>
      </div>
    </li>
  )
}
