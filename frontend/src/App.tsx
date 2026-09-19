import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ApiError, todosApi } from './api'
import { TodoItem } from './components/TodoItem'
import type { Filter, Todo } from './types'
import './App.css'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Open' },
  { id: 'completed', label: 'Done' },
]

function App() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState<number | 'create' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      setTodos(await todosApi.list())
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Could not reach the Rails API. Is it running on port 3000?',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const visible = useMemo(() => {
    if (filter === 'active') return todos.filter((todo) => !todo.completed)
    if (filter === 'completed') return todos.filter((todo) => todo.completed)
    return todos
  }, [filter, todos])

  const remaining = todos.filter((todo) => !todo.completed).length
  const doneCount = todos.length - remaining

  async function addTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = title.trim()
    if (!next) return

    setPendingId('create')
    setError(null)
    try {
      const created = await todosApi.create(next)
      setTodos((current) => [created, ...current])
      setTitle('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add that task.')
    } finally {
      setPendingId(null)
    }
  }

  async function toggleTodo(todo: Todo) {
    setPendingId(todo.id)
    setError(null)
    try {
      const updated = await todosApi.update(todo.id, { completed: !todo.completed })
      setTodos((current) =>
        current.map((item) => (item.id === todo.id ? updated : item)),
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update that task.')
    } finally {
      setPendingId(null)
    }
  }

  async function renameTodo(todo: Todo, nextTitle: string) {
    setPendingId(todo.id)
    setError(null)
    try {
      const updated = await todosApi.update(todo.id, { title: nextTitle })
      setTodos((current) =>
        current.map((item) => (item.id === todo.id ? updated : item)),
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not rename that task.')
      throw cause
    } finally {
      setPendingId(null)
    }
  }

  async function deleteTodo(todo: Todo) {
    setPendingId(todo.id)
    setError(null)
    try {
      await todosApi.remove(todo.id)
      setTodos((current) => current.filter((item) => item.id !== todo.id))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete that task.')
    } finally {
      setPendingId(null)
    }
  }

  async function clearCompleted() {
    const completed = todos.filter((todo) => todo.completed)
    setError(null)
    try {
      await Promise.all(completed.map((todo) => todosApi.remove(todo.id)))
      setTodos((current) => current.filter((todo) => !todo.completed))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not clear completed tasks.')
      await load()
    }
  }

  return (
    <div className="page">
      <header className="masthead">
        <p className="eyebrow">React · Rails · PostgreSQL</p>
        <h1>Ledger</h1>
        <p className="lede">
          A small task list with a Rails JSON API and Postgres behind it.
        </p>
      </header>

      <main className="panel">
        <form className="composer" onSubmit={addTodo}>
          <label className="sr-only" htmlFor="new-todo">
            New task
          </label>
          <input
            id="new-todo"
            value={title}
            maxLength={255}
            placeholder="What needs to get done?"
            autoComplete="off"
            disabled={pendingId === 'create'}
            onChange={(event) => setTitle(event.target.value)}
          />
          <button type="submit" disabled={!title.trim() || pendingId === 'create'}>
            Add
          </button>
        </form>

        <div className="toolbar">
          <p className="count">
            {loading
              ? 'Loading…'
              : `${remaining} open · ${todos.length} total`}
          </p>
          <div className="filters" role="tablist" aria-label="Filter tasks">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={filter === item.id}
                className={filter === item.id ? 'is-active' : undefined}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="banner" role="alert">
            <span>{error}</span>
            <button type="button" className="ghost" onClick={() => void load()}>
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <p className="empty">Fetching tasks from Postgres…</p>
        ) : visible.length === 0 ? (
          <p className="empty">
            {todos.length === 0
              ? 'Nothing here yet. Add the first task above.'
              : 'No tasks in this filter.'}
          </p>
        ) : (
          <ul className="todo-list">
            {visible.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                busy={pendingId === todo.id}
                onToggle={toggleTodo}
                onRename={renameTodo}
                onDelete={deleteTodo}
              />
            ))}
          </ul>
        )}

        {doneCount > 0 && (
          <footer className="panel-foot">
            <button type="button" className="ghost" onClick={() => void clearCompleted()}>
              Clear {doneCount} completed
            </button>
          </footer>
        )}
      </main>
    </div>
  )
}

export default App
