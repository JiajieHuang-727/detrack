import { Fragment, useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import Alert from 'react-bootstrap/Alert'
import Badge from 'react-bootstrap/Badge'
import Button from 'react-bootstrap/Button'
import Card from 'react-bootstrap/Card'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'
import Row from 'react-bootstrap/Row'
import Spinner from 'react-bootstrap/Spinner'
import Table from 'react-bootstrap/Table'
import { ApiError, deliveriesApi } from '../api'
import {
  DELIVERY_STATUSES,
  DELIVERY_STATUS_TRANSITIONS,
  PAGE_SIZE,
  type Delivery,
  type DeliveryHistory,
  type DeliveryStatus,
} from '../types'
import { PaginationBar } from './PaginationBar'
import { ColumnGroup, ResizableTh } from './ResizableTh'
import { useColumnWidths } from './useColumnWidths'

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

function formatTimestamp(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function statusLabel(status: string) {
  return status.replaceAll('_', ' ')
}

type SortKey = 'reference' | 'customer_name' | 'address' | 'lat' | 'long' | 'status' | 'window'
type SortDirection = 'asc' | 'desc'

const STATUS_BADGE: Record<DeliveryStatus, string> = {
  created: 'status-created',
  picked_up: 'status-picked-up',
  in_transit: 'status-in-transit',
  delivered: 'status-delivered',
  failed: 'status-failed',
}

function StatusBadge({ status }: { status: DeliveryStatus }) {
  return (
    <Badge pill bg="" className={STATUS_BADGE[status]}>
      {statusLabel(status)}
    </Badge>
  )
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
  const [updatingRef, setUpdatingRef] = useState<string | null>(null)
  const [nextStatus, setNextStatus] = useState<DeliveryStatus>('picked_up')
  const [pendingRef, setPendingRef] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [statusDraft, setStatusDraft] = useState<DeliveryStatus | ''>('')
  const [referenceQuery, setReferenceQuery] = useState('')
  const [customerQuery, setCustomerQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | ''>('')
  const [referenceFilter, setReferenceFilter] = useState('')
  const [customerFilter, setCustomerFilter] = useState('')
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [historyRef, setHistoryRef] = useState<string | null>(null)
  const [histories, setHistories] = useState<DeliveryHistory[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const historyRequestRef = useRef<string | null>(null)
  const { widths, setWidth, commit } = useColumnWidths('delivery-table-widths-v2', [
    130, 170, 240, 110, 110, 120, 120, 280,
  ])

  const loadDeliveries = useCallback(async (pageNum = page) => {
    const result = await deliveriesApi.list({
      page: pageNum,
      perPage: PAGE_SIZE,
      status: statusFilter || undefined,
      reference: referenceFilter || undefined,
      customer: customerFilter || undefined,
      sort: sortKey ?? undefined,
      dir: sortKey ? sortDirection : undefined,
    })
    setRows(result.items)
    setPage(result.page)
    setTotal(result.total)
    setTotalPages(result.total_pages)
  }, [page, statusFilter, referenceFilter, customerFilter, sortKey, sortDirection])

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      await loadDeliveries()
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Could not reach the Rails API. Is it running on port 3000?',
      )
    } finally {
      setLoading(false)
    }
  }, [loadDeliveries])

  useEffect(() => {
    let cancelled = false
    setError(null)
    setLoading(true)
    loadDeliveries()
      .catch((cause) => {
        if (cancelled) return
        setError(
          cause instanceof ApiError
            ? cause.message
            : 'Could not reach the Rails API. Is it running on port 3000?',
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [loadDeliveries])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
    setPage(1)
  }

  function headerSort(key: SortKey): SortDirection | null {
    return sortKey === key ? sortDirection : null
  }

  function searchDeliveries(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatusFilter(statusDraft)
    setReferenceFilter(referenceQuery.trim())
    setCustomerFilter(customerQuery.trim())
    setPage(1)
  }

  const hasActiveFilters = Boolean(statusFilter || referenceFilter || customerFilter)

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
      await deliveriesApi.create({
        reference: reference.trim(),
        customer_name: customerName.trim(),
        address: address.trim(),
        time_window_start: windowStart,
        time_window_end: windowEnd,
      })
      await loadDeliveries(1)
      setReference('')
      setCustomerName('')
      setAddress('')
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

  const loadHistories = useCallback(async (reference: string) => {
    historyRequestRef.current = reference
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const items = await deliveriesApi.histories(reference)
      if (historyRequestRef.current !== reference) return
      setHistories(items)
    } catch (cause) {
      if (historyRequestRef.current !== reference) return
      setHistories([])
      setHistoryError(cause instanceof Error ? cause.message : 'Could not load status history.')
    } finally {
      if (historyRequestRef.current === reference) {
        setHistoryLoading(false)
      }
    }
  }, [])

  function toggleHistory(reference: string) {
    if (historyRef === reference) {
      historyRequestRef.current = null
      setHistoryRef(null)
      setHistories([])
      setHistoryError(null)
      setHistoryLoading(false)
      return
    }

    setHistoryRef(reference)
    setHistories([])
    setHistoryError(null)
    setHistoryLoading(true)
    void loadHistories(reference)
  }

  async function confirmUpdate(row: Delivery) {
    setPendingRef(row.reference)
    setError(null)
    try {
      await deliveriesApi.updateStatus(row.reference, nextStatus)
      await loadDeliveries()
      setUpdatingRef(null)
      if (historyRef === row.reference) {
        void loadHistories(row.reference)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update that delivery.')
    } finally {
      setPendingRef(null)
    }
  }

  return (
    <Card>
      <Card.Body className="border-bottom">
        <Form onSubmit={addDelivery}>
          <Row className="g-2 align-items-end">
            <Col lg={2} md={4} sm={6}>
              <Form.Group controlId="new-reference">
                <Form.Label>Reference</Form.Label>
                <Form.Control
                  value={reference}
                  placeholder="TV-300001"
                  autoComplete="off"
                  disabled={saving}
                  onChange={(event) => setReference(event.target.value)}
                />
              </Form.Group>
            </Col>
            <Col lg={2} md={4} sm={6}>
              <Form.Group controlId="new-customer">
                <Form.Label>Customer</Form.Label>
                <Form.Control
                  value={customerName}
                  placeholder="Coastal Electronics"
                  autoComplete="off"
                  disabled={saving}
                  onChange={(event) => setCustomerName(event.target.value)}
                />
              </Form.Group>
            </Col>
            <Col lg>
              <Form.Group controlId="new-delivery-address">
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
            <Col lg={2} md={3} sm={6}>
              <Form.Group controlId="new-window-start">
                <Form.Label>Start</Form.Label>
                <Form.Control
                  type="time"
                  value={windowStart}
                  disabled={saving}
                  onChange={(event) => setWindowStart(event.target.value)}
                />
              </Form.Group>
            </Col>
            <Col lg={2} md={3} sm={6}>
              <Form.Group controlId="new-window-end">
                <Form.Label>End</Form.Label>
                <Form.Control
                  type="time"
                  value={windowEnd}
                  disabled={saving}
                  onChange={(event) => setWindowEnd(event.target.value)}
                />
              </Form.Group>
            </Col>
            <Col lg="auto">
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

      <Card.Body className="border-bottom py-3">
        <Form onSubmit={searchDeliveries}>
          <Row className="g-2 align-items-end">
            <Col md={3} sm={6}>
              <Form.Group controlId="reference-filter">
                <Form.Label>Reference</Form.Label>
                <Form.Control
                  value={referenceQuery}
                  placeholder="All"
                  autoComplete="off"
                  aria-label="Filter deliveries by reference"
                  onChange={(event) => setReferenceQuery(event.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3} sm={6}>
              <Form.Group controlId="customer-filter">
                <Form.Label>Customer</Form.Label>
                <Form.Control
                  value={customerQuery}
                  placeholder="All"
                  autoComplete="off"
                  aria-label="Filter deliveries by customer"
                  onChange={(event) => setCustomerQuery(event.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3} sm={6}>
              <Form.Group controlId="status-filter">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={statusDraft}
                  aria-label="Filter deliveries by status"
                  onChange={(event) =>
                    setStatusDraft((event.target.value || '') as DeliveryStatus | '')
                  }
                >
                  <option value="">All</option>
                  {DELIVERY_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md="auto">
              <Button type="submit" variant="outline-primary">
                Search
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
            <ResizableTh
              width={widths[0]}
              onResize={(width) => setWidth(0, width)}
              onResizeEnd={commit}
              sortDirection={headerSort('reference')}
              onSort={() => toggleSort('reference')}
            >
              Reference
            </ResizableTh>
            <ResizableTh
              width={widths[1]}
              onResize={(width) => setWidth(1, width)}
              onResizeEnd={commit}
              sortDirection={headerSort('customer_name')}
              onSort={() => toggleSort('customer_name')}
            >
              Customer
            </ResizableTh>
            <ResizableTh
              width={widths[2]}
              onResize={(width) => setWidth(2, width)}
              onResizeEnd={commit}
              sortDirection={headerSort('address')}
              onSort={() => toggleSort('address')}
            >
              Address
            </ResizableTh>
            <ResizableTh
              width={widths[3]}
              onResize={(width) => setWidth(3, width)}
              onResizeEnd={commit}
              sortDirection={headerSort('lat')}
              onSort={() => toggleSort('lat')}
            >
              Lat
            </ResizableTh>
            <ResizableTh
              width={widths[4]}
              onResize={(width) => setWidth(4, width)}
              onResizeEnd={commit}
              sortDirection={headerSort('long')}
              onSort={() => toggleSort('long')}
            >
              Lng
            </ResizableTh>
            <ResizableTh
              width={widths[5]}
              onResize={(width) => setWidth(5, width)}
              onResizeEnd={commit}
              sortDirection={headerSort('status')}
              onSort={() => toggleSort('status')}
            >
              Status
            </ResizableTh>
            <ResizableTh
              width={widths[6]}
              onResize={(width) => setWidth(6, width)}
              onResizeEnd={commit}
              sortDirection={headerSort('window')}
              onSort={() => toggleSort('window')}
            >
              Window
            </ResizableTh>
            <ResizableTh width={widths[7]} onResize={(width) => setWidth(7, width)} onResizeEnd={commit} />
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={8} className="text-secondary py-4">
                <Spinner animation="border" size="sm" className="me-2" />
                Loading deliveries from Postgres…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-secondary py-4">
                {hasActiveFilters
                  ? 'No deliveries match those filters.'
                  : 'Nothing stored yet. Use the form above to add the first row.'}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const nextStatuses = DELIVERY_STATUS_TRANSITIONS[row.status]
              const updating = updatingRef === row.reference
              const busy = pendingRef === row.reference
              const expanded = historyRef === row.reference

              return (
                <Fragment key={row.reference}>
                  <tr>
                    <td>{row.reference}</td>
                    <td>{row.customer_name}</td>
                    <td>{row.address}</td>
                    <td className="numeric">{formatCoord(row.lat)}</td>
                    <td className="numeric">{formatCoord(row.long)}</td>
                    <td>
                      {updating ? (
                        <Form.Select
                          size="sm"
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
                        </Form.Select>
                      ) : (
                        <StatusBadge status={row.status} />
                      )}
                    </td>
                    <td className="numeric">
                      {formatTime(row.time_window_start)}–{formatTime(row.time_window_end)}
                    </td>
                    <td className="text-end text-nowrap actions-cell">
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        className="me-1"
                        aria-expanded={expanded}
                        onClick={() => toggleHistory(row.reference)}
                      >
                        View history
                      </Button>
                      {nextStatuses.length === 0 ? null : updating ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline-primary"
                            className="me-1"
                            disabled={busy || nextStatus === row.status}
                            onClick={() => void confirmUpdate(row)}
                          >
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            disabled={busy}
                            onClick={() => setUpdatingRef(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline-primary"
                          disabled={pendingRef !== null || saving}
                          onClick={() => startUpdate(row)}
                        >
                          Update
                        </Button>
                      )}
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="history-row">
                      <td colSpan={8}>
                        {historyLoading ? (
                          <div className="text-secondary py-2">
                            <Spinner animation="border" size="sm" className="me-2" />
                            Loading history…
                          </div>
                        ) : historyError ? (
                          <div className="d-flex align-items-center justify-content-between gap-3 py-2">
                            <span className="text-danger">{historyError}</span>
                            <Button
                              size="sm"
                              variant="link"
                              className="p-0"
                              onClick={() => void loadHistories(row.reference)}
                            >
                              Retry
                            </Button>
                          </div>
                        ) : histories.length === 0 ? (
                          <div className="text-secondary py-2">No status history yet.</div>
                        ) : (
                          <ul className="list-unstyled mb-0 py-1">
                            {histories.map((item) => (
                              <li key={item.id} className="history-entry">
                                <time dateTime={item.created_at}>{formatTimestamp(item.created_at)}</time>
                                <StatusBadge status={item.status} />
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })
          )}
        </tbody>
      </Table>
      <PaginationBar
        page={page}
        totalPages={totalPages}
        total={total}
        disabled={loading || pendingRef !== null}
        onPageChange={setPage}
      />
    </Card>
  )
}
