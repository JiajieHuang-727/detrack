import type { Todo } from './types'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api/v1'

type TodoPayload = {
  title?: string
  completed?: boolean
}

class ApiError extends Error {
  status: number
  errors: string[]

  constructor(message: string, status: number, errors: string[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const body = (await response.json().catch(() => null)) as
    | T
    | { errors?: string[] }
    | null

  if (!response.ok) {
    const errors =
      body && typeof body === 'object' && 'errors' in body
        ? (body.errors ?? [])
        : []
    throw new ApiError(
      errors[0] ?? `Request failed with ${response.status}`,
      response.status,
      errors,
    )
  }

  return body as T
}

export const todosApi = {
  list: () => request<Todo[]>('/todos'),
  create: (title: string) =>
    request<Todo>('/todos', {
      method: 'POST',
      body: JSON.stringify({ todo: { title } satisfies TodoPayload }),
    }),
  update: (id: number, payload: TodoPayload) =>
    request<Todo>(`/todos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ todo: payload }),
    }),
  remove: (id: number) =>
    request<void>(`/todos/${id}`, {
      method: 'DELETE',
    }),
}

export { ApiError }
