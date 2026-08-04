import { useState } from 'react'

export interface AccountOption {
  id: string
  label: string
  kind: 'LIVE' | 'DEMO' | 'SIM'
  broker: string
  port?: number
  disabled?: boolean
  badge?: string
}

/// The real Interactive Brokers accounts, with the ports their Gateway listens
/// on. LIVE and DEMO are separate accounts and never share a number: labelling
/// one with the other's identifier is how a test order reaches real money.
const DEFAULT_ACCOUNTS: AccountOption[] = [
  {
    id: 'live-ibkr-U27457555',
    label: 'live-ibkr-U27457555',
    kind: 'LIVE',
    broker: 'ibkr',
    port: 4001,
    // Kept unselectable on purpose: nothing in this project trades live yet.
    disabled: true,
    badge: 'NON DISPONIBLE',
  },
  {
    id: 'demo-ibkr-DUR611871',
    label: 'demo-ibkr-DUR611871',
    kind: 'DEMO',
    broker: 'ibkr',
    port: 4002,
    disabled: false,
  },
  {
    id: 'sim-synthetic',
    label: 'sim-synthetic',
    kind: 'SIM',
    broker: 'paper',
    badge: 'prix simulés',
  },
]

interface AccountSelectorProps {
  selectedId: string
  onSelect: (account: AccountOption) => void
}

export default function AccountSelector({ selectedId, onSelect }: AccountSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selectedAccount =
    DEFAULT_ACCOUNTS.find((a) => a.id === selectedId) || DEFAULT_ACCOUNTS[1]

  const filtered = DEFAULT_ACCOUNTS.filter(
    (a) =>
      a.label.toLowerCase().includes(search.toLowerCase()) ||
      a.kind.toLowerCase().includes(search.toLowerCase())
  )

  const liveAccounts = filtered.filter((a) => a.kind === 'LIVE')
  const demoAccounts = filtered.filter((a) => a.kind === 'DEMO')
  const simAccounts = filtered.filter((a) => a.kind === 'SIM')

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Selector Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#0a0a0a',
          border: '1px solid rgba(0, 229, 153, 0.3)',
          borderRadius: '16px',
          padding: '6px 14px',
          color: '#ffffff',
          fontSize: '0.85rem',
          fontFamily: 'monospace',
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: selectedAccount.kind === 'LIVE' ? '#ff4d4d' : selectedAccount.kind === 'DEMO' ? '#00e599' : '#a855f7',
          }}
        />
        <span>{selectedAccount.label}</span>
        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
          {selectedAccount.kind}
        </span>
        <span style={{ fontSize: '0.7rem', marginLeft: '4px' }}>▼</span>
      </button>

      {/* Modal Dropdown Container */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '40px',
            left: '0',
            width: '320px',
            backgroundColor: '#0a0d0e',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            padding: '12px',
            zIndex: 100,
            boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
          }}
        >
          {/* Search Box */}
          <input
            type="text"
            placeholder="chercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#121618',
              border: '1px solid rgba(0, 229, 153, 0.4)',
              borderRadius: '6px',
              padding: '6px 10px',
              color: '#ffffff',
              fontSize: '0.8rem',
              outline: 'none',
              marginBottom: '12px',
              boxSizing: 'border-box',
            }}
          />

          {/* Category LIVE */}
          <div style={{ marginBottom: '12px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.65rem',
                color: 'rgba(255,255,255,0.4)',
                fontWeight: 600,
                letterSpacing: '1px',
                marginBottom: '6px',
              }}
            >
              <span>LIVE ({liveAccounts.length})</span>
              <span style={{ color: '#00e599', cursor: 'default' }}>NON DISPONIBLE</span>
            </div>
            {liveAccounts.map((acc) => (
              <div
                key={acc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  opacity: 0.5,
                  cursor: 'not-allowed',
                  fontSize: '0.78rem',
                  fontFamily: 'monospace',
                }}
              >
                <input type="checkbox" disabled checked={false} />
                <span style={{ flex: 1, color: '#888' }}>{acc.label}</span>
                <span
                  style={{
                    fontSize: '0.6rem',
                    backgroundColor: '#ff4d4d22',
                    color: '#ff4d4d',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {acc.badge}
                </span>
              </div>
            ))}
          </div>

          {/* Category DEMO */}
          <div style={{ marginBottom: '12px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.65rem',
                color: 'rgba(255,255,255,0.4)',
                fontWeight: 600,
                letterSpacing: '1px',
                marginBottom: '6px',
              }}
            >
              <span>DEMO ({demoAccounts.length})</span>
            </div>
            {demoAccounts.map((acc) => (
              <div
                key={acc.id}
                onClick={() => {
                  if (!acc.disabled) {
                    onSelect(acc)
                    setIsOpen(false)
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  backgroundColor: selectedId === acc.id ? 'rgba(0,229,153,0.1)' : 'transparent',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontFamily: 'monospace',
                  color: selectedId === acc.id ? '#00e599' : '#e0e0e0',
                }}
              >
                <input
                  type="checkbox"
                  readOnly
                  checked={selectedId === acc.id}
                  style={{ accentColor: '#00e599' }}
                />
                <span style={{ flex: 1 }}>{acc.label}</span>
                {acc.port && (
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>
                    :{acc.port}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Category SIM */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.65rem',
                color: 'rgba(255,255,255,0.4)',
                fontWeight: 600,
                letterSpacing: '1px',
                marginBottom: '6px',
              }}
            >
              <span>SIM ({simAccounts.length})</span>
            </div>
            {simAccounts.map((acc) => (
              <div
                key={acc.id}
                onClick={() => {
                  onSelect(acc)
                  setIsOpen(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  backgroundColor: selectedId === acc.id ? 'rgba(168,85,247,0.15)' : 'transparent',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontFamily: 'monospace',
                  color: selectedId === acc.id ? '#c084fc' : '#cccccc',
                }}
              >
                <input
                  type="checkbox"
                  readOnly
                  checked={selectedId === acc.id}
                  style={{ accentColor: '#a855f7' }}
                />
                <span style={{ flex: 1 }}>{acc.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
