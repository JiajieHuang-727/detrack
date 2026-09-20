import type { Address, Delivery } from './types'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api/v1'

type AddressPayload = {
  address: string
  lat: number
  long: number
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

export const addressesApi = {
  list: () => request<Address[]>('/addresses'),
  create: (payload: AddressPayload) =>
    request<Address>('/addresses', {
      method: 'POST',
      body: JSON.stringify({ address: payload }),
    }),
}

type DeliveryPayload = {
  reference: string
  customer_name: string
  address: string
  time_window_start: string
  time_window_end: string
}

export const deliveriesApi = {
  list: () => request<Delivery[]>('/deliveries'),
  create: (payload: DeliveryPayload) =>
    request<Delivery>('/deliveries', {
      method: 'POST',
      body: JSON.stringify({ delivery: payload }),
    }),
}

export { ApiError }
