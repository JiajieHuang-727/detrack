import { useRef, useState } from 'react'
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import Collapse from 'react-bootstrap/Collapse'
import Container from 'react-bootstrap/Container'
import Nav from 'react-bootstrap/Nav'
import Spinner from 'react-bootstrap/Spinner'
import Toast from 'react-bootstrap/Toast'
import ToastContainer from 'react-bootstrap/ToastContainer'
import { ApiError, deliveriesApi } from './api'
import { AddressPage } from './components/AddressPage'
import { DeliveryPage } from './components/DeliveryPage'
import './App.css'

const TABS = [
  { id: 'address', label: 'Address' },
  { id: 'deliveries', label: 'Deliveries' },
] as const

type TabId = (typeof TABS)[number]['id']

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('address')
  const [refreshKey, setRefreshKey] = useState(0)
  const [importing, setImporting] = useState(false)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [importedCount, setImportedCount] = useState(0)
  const [showImportDetails, setShowImportDetails] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function importCsv(file: File) {
    setImporting(true)
    setImportErrors([])
    setImportedCount(0)
    setShowImportDetails(false)
    try {
      const result = await deliveriesApi.importCsv(file)
      setRefreshKey((current) => current + 1)
      setImportedCount(result.imported.length)
      setImportErrors(result.errors)
      if (result.imported.length > 0) {
        setToastMessage(`Imported ${result.imported.length} deliveries`)
      }
    } catch (cause) {
      setImportErrors(
        cause instanceof ApiError
          ? cause.errors.length > 0
            ? cause.errors
            : [cause.message]
          : ['Could not import that CSV. Is the Rails API running on port 3000?'],
      )
    } finally {
      setImporting(false)
    }
  }

  return (
    <Container className="page py-4 py-md-5">
      <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-3">
        <div>
          <p className="eyebrow mb-2">Delivery Status Tracker</p>
          <Nav
            variant="tabs"
            activeKey={activeTab}
            onSelect={(key) => {
              if (key === 'address' || key === 'deliveries') setActiveTab(key)
            }}
            aria-label="Pages"
          >
            {TABS.map((tab) => (
              <Nav.Item key={tab.id}>
                <Nav.Link eventKey={tab.id}>{tab.label}</Nav.Link>
              </Nav.Item>
            ))}
          </Nav>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) void importCsv(file)
            }}
          />
          <Button disabled={importing} onClick={() => fileInputRef.current?.click()}>
            {importing ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Importing…
              </>
            ) : (
              'Import from CSV'
            )}
          </Button>
        </div>
      </div>

      {importErrors.length > 0 && (
        <Alert
          variant="warning"
          dismissible
          onClose={() => {
            setImportErrors([])
            setImportedCount(0)
          }}
        >
          <div className="d-flex justify-content-between align-items-start gap-3">
            <div>
              <Alert.Heading className="h6 mb-1">
                {importedCount > 0
                  ? `Imported ${importedCount}, skipped ${importErrors.length}`
                  : `Skipped ${importErrors.length} rows`}
              </Alert.Heading>
              <Button
                variant="link"
                size="sm"
                className="p-0"
                onClick={() => setShowImportDetails((open) => !open)}
                aria-expanded={showImportDetails}
              >
                {showImportDetails ? 'Hide details' : 'Show details'}
              </Button>
              <Collapse in={showImportDetails}>
                <ul className="small mb-0 mt-2 ps-3 import-details">
                  {importErrors.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </Collapse>
            </div>
          </div>
        </Alert>
      )}

      <main>
        {activeTab === 'address' && <AddressPage key={refreshKey} />}
        {activeTab === 'deliveries' && <DeliveryPage key={refreshKey} />}
      </main>

      <ToastContainer position="bottom-end" className="p-3">
        <Toast
          bg="success"
          show={toastMessage !== null}
          onClose={() => setToastMessage(null)}
          delay={3200}
          autohide
        >
          <Toast.Body className="text-white">{toastMessage}</Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  )
}

export default App
