import { useState } from 'react'
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

  return (
    <div className="page">
      <header className="app-header">
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
      </header>

      <main>
        {activeTab === 'address' && <AddressPage />}
        {activeTab === 'deliveries' && <DeliveryPage />}
      </main>
    </div>
  )
}

export default App
