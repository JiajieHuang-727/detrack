import type { Address, Delivery, DeliveryHistory, DeliveryStatus, Paginated } from './types'
import { PAGE_SIZE } from './types'

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

type DeliveryImportResult = {
  imported: Delivery[]
  errors: string[]
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const { headers: extraHeaders, body, ...rest } = options ?? {}
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  const headers = new Headers({
    Accept: 'application/json',
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
  })
  if (extraHeaders) {
    new Headers(extraHeaders).forEach((value, key) => {
      headers.set(key, value)
    })
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
    body,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const payload = (await response.json().catch(() => null)) as
    | T
    | { errors?: string[] }
    | null

  if (!response.ok) {
    const errors =
      payload && typeof payload === 'object' && 'errors' in payload
        ? (payload.errors ?? [])
        : []
    throw new ApiError(
      errors[0] ?? `Request failed with ${response.status}`,
      response.status,
      errors,
    )
  }

  return payload as T
}

function toQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '') return
    search.set(key, String(value))
  })
  const query = search.toString()
  return query ? `?${query}` : ''
}

export type AddressListParams = {
  page?: number
  perPage?: number
}

export const addressesApi = {
  list: (params: AddressListParams = {}) =>
    request<Paginated<Address>>(
      `/addresses${toQuery({
        page: params.page,
        per_page: params.perPage,
      })}`,
    ),
  create: (payload: AddressPayload) =>
    request<Address>('/addresses', {
      method: 'POST',
      body: JSON.stringify({ address: payload }),
    }),
  update: (id: number, payload: AddressPayload) =>
    request<Address>(`/addresses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ address: payload }),
    }),
  remove: (id: number) =>
    request<void>(`/addresses/${id}`, {
      method: 'DELETE',
    }),
}

type DeliveryPayload = {
  reference: string
  customer_name: string
  address_id: number
  time_window_start: string
  time_window_end: string
}

export type DeliveryListParams = {
  page?: number
  perPage?: number
  status?: DeliveryStatus
  sort?: string
  dir?: 'asc' | 'desc'
}

export const deliveriesApi = {
  list: (params: DeliveryListParams = {}) =>
    request<Paginated<Delivery>>(
      `/deliveries${toQuery({
        page: params.page,
        per_page: params.perPage ?? PAGE_SIZE,
        status: params.status,
        sort: params.sort,
        dir: params.dir,
      })}`,
    ),
  create: (payload: DeliveryPayload) =>
    request<Delivery>('/deliveries', {
      method: 'POST',
      body: JSON.stringify({ delivery: payload }),
    }),
  updateStatus: (reference: string, status: DeliveryStatus) =>
    request<Delivery>(`/deliveries/${encodeURIComponent(reference)}`, {
      method: 'PATCH',
      body: JSON.stringify({ delivery: { status } }),
    }),
  histories: (reference: string) =>
    request<DeliveryHistory[]>(`/deliveries/${encodeURIComponent(reference)}/histories`),
  importCsv: (file: File) => {
    const body = new FormData()
    body.append('file', file)
    return request<DeliveryImportResult>('/deliveries/import', {
      method: 'POST',
      body,
    })
  },
}

export { ApiError }
