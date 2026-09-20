import { useCallback, useEffect, useState, type FormEvent } from 'react'
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import Card from 'react-bootstrap/Card'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'
import Row from 'react-bootstrap/Row'
import Spinner from 'react-bootstrap/Spinner'
import Table from 'react-bootstrap/Table'
import { addressesApi, ApiError } from '../api'
import type { Address } from '../types'
import { ColumnGroup, ResizableTh } from './ResizableTh'
import { useColumnWidths } from './useColumnWidths'

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
  const { widths, setWidth, commit } = useColumnWidths('address-table-widths', [420, 140, 140, 180])

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
    <Card>
      <Card.Body className="border-bottom">
        <Form onSubmit={addAddress}>
          <Row className="g-2 align-items-end">
            <Col md>
              <Form.Group controlId="new-address">
                <Form.Label>Address</Form.Label>
                <Form.Control
                  value={address}
                  placeholder="25 Pitt St, Hurstville NSW"
                  autoComplete="off"
                  disabled={saving}
                  onChange={(event) => setAddress(event.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={2} sm={6}>
              <Form.Group controlId="new-lat">
                <Form.Label>Lat</Form.Label>
                <Form.Control
                  value={lat}
                  inputMode="decimal"
                  placeholder="-33.949285"
                  autoComplete="off"
                  disabled={saving}
                  onChange={(event) => setLat(event.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={2} sm={6}>
              <Form.Group controlId="new-lng">
                <Form.Label>Lng</Form.Label>
                <Form.Control
                  value={lng}
                  inputMode="decimal"
                  placeholder="151.098093"
                  autoComplete="off"
                  disabled={saving}
                  onChange={(event) => setLng(event.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md="auto">
              <Button type="submit" disabled={!canSubmit} className="w-100">
                {saving ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Saving…
                  </>
                ) : (
                  'Add'
                )}
              </Button>
            </Col>
          </Row>
        </Form>
      </Card.Body>

      {error && (
        <Alert variant="danger" className="rounded-0 mb-0 d-flex justify-content-between align-items-center">
          <span>{error}</span>
          <Button variant="link" size="sm" onClick={() => void load()}>
            Retry
          </Button>
        </Alert>
      )}

      <Table hover responsive className="mb-0 align-middle table-resizable">
        <ColumnGroup widths={widths} />
        <thead>
          <tr>
            <ResizableTh width={widths[0]} onResize={(width) => setWidth(0, width)} onResizeEnd={commit}>
              Address
            </ResizableTh>
            <ResizableTh width={widths[1]} onResize={(width) => setWidth(1, width)} onResizeEnd={commit}>
              Lat
            </ResizableTh>
            <ResizableTh width={widths[2]} onResize={(width) => setWidth(2, width)} onResizeEnd={commit}>
              Lng
            </ResizableTh>
            <ResizableTh width={widths[3]} onResize={(width) => setWidth(3, width)} onResizeEnd={commit} />
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={4} className="text-secondary py-4">
                <Spinner animation="border" size="sm" className="me-2" />
                Loading addresses from Postgres…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-secondary py-4">
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
                      <Form.Control
                        size="sm"
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
                      <Form.Control
                        size="sm"
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
                      <Form.Control
                        size="sm"
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
                  <td className="text-end text-nowrap">
                    {editing ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          className="me-1"
                          disabled={!canSaveEdit}
                          onClick={() => void saveEdit(row.id)}
                        >
                          Save
                        </Button>
                        <Button size="sm" variant="outline-secondary" disabled={busy} onClick={cancelEdit}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          className="me-1"
                          disabled={pendingId !== null || saving}
                          onClick={() => startEdit(row)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          disabled={pendingId !== null || saving}
                          onClick={() => void deleteAddress(row)}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </Table>
    </Card>
  )
}
