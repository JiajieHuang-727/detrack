export type Address = {
  id: number
  address: string
  lat: string | number
  long: string | number
  created_at: string
  updated_at: string
}

export const DELIVERY_STATUSES = [
  'created',
  'picked_up',
  'in_transit',
  'delivered',
  'failed',
] as const

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number]

export const DELIVERY_STATUS_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  created: ['picked_up', 'failed'],
  picked_up: ['in_transit', 'failed'],
  in_transit: ['delivered', 'failed'],
  delivered: [],
  failed: [],
}

export type Delivery = {
  reference: string
  customer_name: string
  address: string
  lat: string | number | null
  long: string | number | null
  status: DeliveryStatus
  time_window_start: string | null
  time_window_end: string | null
  created_at: string
  updated_at: string
}
