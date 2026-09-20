import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { addressesApi, ApiError } from '../api'
import type { Address } from '../types'

function formatCoord(value: string | number) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric.toString() : String(value)
}

type Draft = {
  address: string
  lat: string
  lng: string
}

function draftFrom(row: Address): Draft {
  return {
    address: row.address,
    lat: formatCoord(row.lat),
    lng: formatCoord(row.long),
  }
}

export function AddressPage() {
  const [rows, setRows] = useState<Address[]>([])
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draft, setDraft] = useState<Draft>({ address: '', lat: '', lng: '' })
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      setRows(await addressesApi.list())
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
    address.trim().length > 0 &&
    lat.trim().length > 0 &&
    lng.trim().length > 0 &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng)) &&
    !saving

  const canSaveEdit =
    draft.address.trim().length > 0 &&
    draft.lat.trim().length > 0 &&
    draft.lng.trim().length > 0 &&
    Number.isFinite(Number(draft.lat)) &&
    Number.isFinite(Number(draft.lng)) &&
    pendingId === null

  async function addAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return

    setSaving(true)
    setError(null)
    try {
      const created = await addressesApi.create({
        address: address.trim(),
        lat: Number(lat),
        long: Number(lng),
      })
      setRows((current) => [created, ...current])
      setAddress('')
      setLat('')
      setLng('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save that address.')
    } finally {
      setSaving(false)
    }
  }

  function startEdit(row: Address) {
    setEditingId(row.id)
    setDraft(draftFrom(row))
    setError(null)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(id: number) {
    if (!canSaveEdit) return

    setPendingId(id)
    setError(null)
    try {
      const updated = await addressesApi.update(id, {
        address: draft.address.trim(),
        lat: Number(draft.lat),
        long: Number(draft.lng),
      })
      setRows((current) => current.map((row) => (row.id === id ? updated : row)))
      setEditingId(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update that address.')
    } finally {
      setPendingId(null)
    }
  }

  async function deleteAddress(row: Address) {
    setPendingId(row.id)
    setError(null)
    try {
      await addressesApi.remove(row.id)
      setRows((current) => current.filter((item) => item.id !== row.id))
      if (editingId === row.id) setEditingId(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete that address.')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <section className="panel">
      <form className="composer" onSubmit={addAddress}>
        <label>
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
          Lat
          <input
            value={lat}
            inputMode="decimal"
            placeholder="-33.949285"
            autoComplete="off"
            disabled={saving}
            onChange={(event) => setLat(event.target.value)}
          />
        </label>
        <label>
          Lng
          <input
            value={lng}
            inputMode="decimal"
            placeholder="151.098093"
            autoComplete="off"
            disabled={saving}
            onChange={(event) => setLng(event.target.value)}
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
              <th>Address</th>
              <th>Lat</th>
              <th>Lng</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="empty">
                  Loading addresses from Postgres…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty">
                  Nothing stored yet. Use the form above to add the first row.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const editing = editingId === row.id
                const busy = pendingId === row.id

                return (
                  <tr key={row.id}>
                    <td>
                      {editing ? (
                        <input
                          value={draft.address}
                          disabled={busy}
                          aria-label="Edit address"
                          onChange={(event) =>
                            setDraft((current) => ({ ...current, address: event.target.value }))
                          }
                        />
                      ) : (
                        row.address
                      )}
                    </td>
                    <td className="numeric">
                      {editing ? (
                        <input
                          value={draft.lat}
                          inputMode="decimal"
                          disabled={busy}
                          aria-label="Edit latitude"
                          onChange={(event) =>
                            setDraft((current) => ({ ...current, lat: event.target.value }))
                          }
                        />
                      ) : (
                        formatCoord(row.lat)
                      )}
                    </td>
                    <td className="numeric">
                      {editing ? (
                        <input
                          value={draft.lng}
                          inputMode="decimal"
                          disabled={busy}
                          aria-label="Edit longitude"
                          onChange={(event) =>
                            setDraft((current) => ({ ...current, lng: event.target.value }))
                          }
                        />
                      ) : (
                        formatCoord(row.long)
                      )}
                    </td>
                    <td className="row-actions">
                      {editing ? (
                        <>
                          <button
                            type="button"
                            className="ghost"
                            disabled={!canSaveEdit}
                            onClick={() => void saveEdit(row.id)}
                          >
                            Save
                          </button>
                          <button type="button" className="ghost" disabled={busy} onClick={cancelEdit}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="ghost"
                            disabled={pendingId !== null || saving}
                            onClick={() => startEdit(row)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="ghost danger"
                            disabled={pendingId !== null || saving}
                            onClick={() => void deleteAddress(row)}
                          >
                            Delete
                          </button>
                        </>
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
