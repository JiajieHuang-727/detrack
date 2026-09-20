import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { addressesApi, ApiError, deliveriesApi } from '../api'
import { DELIVERY_STATUS_TRANSITIONS, type Address, type Delivery, type DeliveryStatus } from '../types'

function formatTime(value: string | null) {
  if (!value) return '—'
  const match = value.match(/(\d{2}:\d{2})/)
  return match?.[1] ?? value
}

function formatCoord(value: string | number | null) {
  if (value === null || value === undefined || value === '') return '—'
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric.toString() : String(value)
}

function statusLabel(status: string) {
  return status.replaceAll('_', ' ')
}

export function DeliveryPage() {
  const [rows, setRows] = useState<Delivery[]>([])
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([])
  const [reference, setReference] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [addressId, setAddressId] = useState<number | "">("")
  const [windowStart, setWindowStart] = useState('08:00')
  const [windowEnd, setWindowEnd] = useState('10:00')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingRef, setUpdatingRef] = useState<string | null>(null)
  const [nextStatus, setNextStatus] = useState<DeliveryStatus>('picked_up')
  const [pendingRef, setPendingRef] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [deliveries, addresses] = await Promise.all([
        deliveriesApi.list(),
        addressesApi.list(),
      ])
      setRows(deliveries)
      setSavedAddresses(addresses)
      setAddressId((current) => {
        if (current && addresses.some((item) => item.id === current)) return current
        return addresses[0]?.id ?? ""
      })
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

  const canSubmit =
    reference.trim().length > 0 &&
    customerName.trim().length > 0 &&
    addressId !== "" &&
    savedAddresses.some((item) => item.id === addressId) &&
    !saving

  async function addDelivery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return

    setSaving(true)
    setError(null)
    try {
      const created = await deliveriesApi.create({
        reference: reference.trim(),
        customer_name: customerName.trim(),
        address_id: Number(addressId),
        time_window_start: windowStart,
        time_window_end: windowEnd,
      })
      setRows((current) => [created, ...current])
      setReference('')
      setCustomerName('')
      setAddressId(savedAddresses[0]?.id ?? "")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save that delivery.')
    } finally {
      setSaving(false)
    }
  }

  function startUpdate(row: Delivery) {
    const options = DELIVERY_STATUS_TRANSITIONS[row.status]
    if (options.length === 0) return
    setUpdatingRef(row.reference)
    setNextStatus(row.status)
    setError(null)
  }

  async function confirmUpdate(row: Delivery) {
    setPendingRef(row.reference)
    setError(null)
    try {
      const updated = await deliveriesApi.updateStatus(row.reference, nextStatus)
      setRows((current) =>
        current.map((item) => (item.reference === row.reference ? updated : item)),
      )
      setUpdatingRef(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update that delivery.')
    } finally {
      setPendingRef(null)
    }
  }

  return (
    <section className="panel">
      <form className="composer composer-delivery" onSubmit={addDelivery}>
        <label>
          Reference
          <input
            value={reference}
            placeholder="TV-300001"
            autoComplete="off"
            disabled={saving}
            onChange={(event) => setReference(event.target.value)}
          />
        </label>
        <label>
          Customer
          <input
            value={customerName}
            placeholder="Coastal Electronics"
            autoComplete="off"
            disabled={saving}
            onChange={(event) => setCustomerName(event.target.value)}
          />
        </label>
        <label className="wide">
          Address
          <select
            value={addressId === "" ? "" : String(addressId)}
            disabled={saving || savedAddresses.length === 0}
            onChange={(event) =>
              setAddressId(event.target.value === "" ? "" : Number(event.target.value))
            }
          >
            {savedAddresses.length === 0 ? (
              <option value="">Add an address first</option>
            ) : (
              savedAddresses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.address}
                </option>
              ))
            )}
          </select>
        </label>
        <label>
          Start
          <input
            type="time"
            value={windowStart}
            disabled={saving}
            onChange={(event) => setWindowStart(event.target.value)}
          />
        </label>
        <label>
          End
          <input
            type="time"
            value={windowEnd}
            disabled={saving}
            onChange={(event) => setWindowEnd(event.target.value)}
          />
        </label>
        <button type="submit" disabled={!canSubmit}>
          {saving ? 'Saving…' : 'Add'}
        </button>
      </form>

      {error && (
        <div className="banner" role="alert">
          <span>{error}</span>
          <button type="button" className="ghost" onClick={() => void load()}>
            Retry
          </button>
        </div>
      )}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Customer</th>
              <th>Address</th>
              <th>Lat</th>
              <th>Lng</th>
              <th>Status</th>
              <th>Window</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="empty">
                  Loading deliveries from Postgres…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty">
                  Nothing stored yet. Use the form above to add the first row.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const nextStatuses = DELIVERY_STATUS_TRANSITIONS[row.status]
                const updating = updatingRef === row.reference
                const busy = pendingRef === row.reference

                return (
                  <tr key={row.reference}>
                    <td>{row.reference}</td>
                    <td>{row.customer_name}</td>
                    <td>{row.address}</td>
                    <td className="numeric">{formatCoord(row.lat)}</td>
                    <td className="numeric">{formatCoord(row.long)}</td>
                    <td>
                      {updating ? (
                        <select
                          value={nextStatus}
                          disabled={busy}
                          aria-label="Next status"
                          onChange={(event) =>
                            setNextStatus(event.target.value as DeliveryStatus)
                          }
                        >
                          <option value={row.status}>{statusLabel(row.status)}</option>
                          {nextStatuses.map((status) => (
                            <option key={status} value={status}>
                              {statusLabel(status)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        statusLabel(row.status)
                      )}
                    </td>
                    <td className="numeric">
                      {formatTime(row.time_window_start)}–{formatTime(row.time_window_end)}
                    </td>
                    <td className="row-actions">
                      {nextStatuses.length === 0 ? null : updating ? (
                        <>
                          <button
                            type="button"
                            className="ghost"
                            disabled={busy || nextStatus === row.status}
                            onClick={() => void confirmUpdate(row)}
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            className="ghost"
                            disabled={busy}
                            onClick={() => setUpdatingRef(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="ghost"
                          disabled={pendingRef !== null || saving}
                          onClick={() => startUpdate(row)}
                        >
                          Update
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
