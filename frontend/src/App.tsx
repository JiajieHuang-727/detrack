import { useRef, useState } from 'react'
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
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function importCsv(file: File) {
    setImporting(true)
    setImportError(null)
    try {
      const result = await deliveriesApi.importCsv(file)
      setRefreshKey((current) => current + 1)
      if (result.errors.length > 0) {
        setImportError(result.errors.join('\n'))
      }
    } catch (cause) {
      setImportError(
        cause instanceof ApiError
          ? cause.errors.join('\n') || cause.message
          : 'Could not import that CSV. Is the Rails API running on port 3000?',
      )
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="page">
      <header className="app-header">
        <div className="header-copy">
          <p className="eyebrow">React · Rails · PostgreSQL</p>
          <nav className="tabs" aria-label="Pages">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={activeTab === tab.id ? 'is-active' : undefined}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="header-actions">
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
          <button
            type="button"
            className="import-csv"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            {importing ? 'Importing…' : 'Import from CSV'}
          </button>
        </div>
      </header>

      {importError && (
        <div className="banner import-banner" role="alert">
          <span>{importError}</span>
          <button type="button" className="ghost" onClick={() => setImportError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <main>
        {activeTab === 'address' && <AddressPage key={refreshKey} />}
        {activeTab === 'deliveries' && <DeliveryPage key={refreshKey} />}
      </main>
    </div>
  )
}

export default App
