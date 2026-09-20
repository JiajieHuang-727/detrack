import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ApiError, deliveriesApi } from '../api'
import type { Delivery } from '../types'

function formatTime(value: string | null) {
  if (!value) return '—'
  const match = value.match(/(\d{2}:\d{2})/)
  return match?.[1] ?? value
}

function statusLabel(status: string) {
  return status.replaceAll('_', ' ')
}

export function DeliveryPage() {
  const [rows, setRows] = useState<Delivery[]>([])
  const [reference, setReference] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [address, setAddress] = useState('')
  const [windowStart, setWindowStart] = useState('08:00')
  const [windowEnd, setWindowEnd] = useState('10:00')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      setRows(await deliveriesApi.list())
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
    address.trim().length > 0 &&
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
        address: address.trim(),
        time_window_start: windowStart,
        time_window_end: windowEnd,
      })
      setRows((current) => [created, ...current])
      setReference('')
      setCustomerName('')
      setAddress('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save that delivery.')
    } finally {
      setSaving(false)
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
          <input
            value={address}
            placeholder="25 Pitt St, Hurstville NSW"
            autoComplete="off"
            disabled={saving}
            onChange={(event) => setAddress(event.target.value)}
          />
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
              <th>Status</th>
              <th>Window</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="empty">
                  Loading deliveries from Postgres…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty">
                  Nothing stored yet. Use the form above to add the first row.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.reference}>
                  <td>{row.reference}</td>
                  <td>{row.customer_name}</td>
                  <td>{row.address}</td>
                  <td>{statusLabel(row.status)}</td>
                  <td className="numeric">
                    {formatTime(row.time_window_start)}–{formatTime(row.time_window_end)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
