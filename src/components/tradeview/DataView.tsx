import { useState } from 'react'

interface AccountRow {
  name: string
  kind: 'LIVE' | 'DEMO' | 'SIM'
  broker: string
  status: 'ACTIVE' | 'INACTIF' | 'HAS RUNNED' | 'READY TO RUN'
}

const ACCOUNTS_DATA: AccountRow[] = [
  { name: 'live-ibkr-U15525670', kind: 'LIVE', broker: 'ibkr', status: 'ACTIVE' },
  { name: 'demo-ibkr-DUA545090', kind: 'DEMO', broker: 'ibkr', status: 'ACTIVE' },
  { name: 'demo-paper-200k', kind: 'DEMO', broker: 'paper', status: 'ACTIVE' },
  { name: 'demo-ctrader-47460733', kind: 'DEMO', broker: 'ctrader', status: 'INACTIF' },
  { name: 'demo-paper-10k', kind: 'DEMO', broker: 'paper', status: 'INACTIF' },
  { name: 'demo-alpaca-PA37WDUXJFP4', kind: 'DEMO', broker: 'alpaca', status: 'INACTIF' },
  { name: 'sim-pltr-2026-01-01_2026-06-20', kind: 'SIM', broker: 'paper', status: 'HAS RUNNED' },
  { name: 'demo-paper-cytest', kind: 'SIM', broker: 'paper', status: 'READY TO RUN' },
  { name: 'sim-blockfade-nvda-0713', kind: 'SIM', broker: 'paper', status: 'HAS RUNNED' },
]

export default function DataView() {
  const [activeCategory, setActiveCategory] = useState<'Account' | 'Symbol' | 'Tick' | 'Candle'>('Account')
  const [selectedRow, setSelectedRow] = useState<AccountRow>(ACCOUNTS_DATA[3])
  const [search] = useState('')

  const filtered = ACCOUNTS_DATA.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: 'calc(100vh - 60px)',
        backgroundColor: '#000000',
        color: '#ffffff',
        overflow: 'hidden',
      }}
    >
      {/* Left Sidebar Entities List */}
      <aside
        style={{
          width: '200px',
          minWidth: '200px',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: '#040607',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          fontSize: '0.8rem',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            fontSize: '0.65rem',
            color: 'rgba(255,255,255,0.4)',
            fontWeight: 700,
            marginBottom: '8px',
          }}
        >
          ENTITÉS
        </div>
        {[
          { name: 'Symbol', count: 2 },
          { name: 'Tick', count: 9 },
          { name: 'Candle', count: 9 },
          { name: 'Account', count: 11 },
          { name: 'Company', count: 10183 },
        ].map((item) => (
          <button
            key={item.name}
            onClick={() => setActiveCategory(item.name as any)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeCategory === item.name ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: activeCategory === item.name ? '#ffffff' : 'rgba(255,255,255,0.5)',
              fontSize: '0.8rem',
              fontWeight: activeCategory === item.name ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            <span>{item.name}</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{item.count}</span>
          </button>
        ))}
      </aside>

      {/* Main Table Area */}
      <main
        style={{
          flex: 1,
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          backgroundColor: '#000000',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
            Account <span style={{ fontSize: '0.8rem', color: '#666' }}>{ACCOUNTS_DATA.length} items</span>
          </h2>
          <button
            style={{
              padding: '6px 16px',
              borderRadius: '16px',
              backgroundColor: '#ffffff',
              border: 'none',
              color: '#000000',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            + CREATE
          </button>
        </div>

        {/* Table */}
        <div
          style={{
            backgroundColor: '#040607',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '40px 2fr 1fr 1fr 1fr',
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              fontSize: '0.7rem',
              color: 'rgba(255,255,255,0.4)',
              fontWeight: 700,
            }}
          >
            <div></div>
            <div>NAME</div>
            <div>KIND</div>
            <div>BROKER</div>
            <div>STATUS</div>
          </div>

          {filtered.map((acc) => {
            const isSelected = selectedRow.name === acc.name
            return (
              <div
                key={acc.name}
                onClick={() => setSelectedRow(acc)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 2fr 1fr 1fr 1fr',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                  alignItems: 'center',
                  backgroundColor: isSelected ? 'rgba(255,255,255,0.04)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <input type="checkbox" readOnly checked={isSelected} style={{ accentColor: '#00e599' }} />
                <div style={{ fontWeight: isSelected ? 700 : 400 }}>{acc.name}</div>
                <div>
                  <span
                    style={{
                      color: acc.kind === 'LIVE' ? '#ff4d4d' : acc.kind === 'DEMO' ? '#00e599' : '#a855f7',
                    }}
                  >
                    ● {acc.kind}
                  </span>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.6)' }}>{acc.broker}</div>
                <div>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      backgroundColor:
                        acc.status === 'ACTIVE'
                          ? 'rgba(0,229,153,0.15)'
                          : acc.status === 'READY TO RUN'
                          ? 'rgba(59,130,246,0.15)'
                          : 'rgba(255,255,255,0.05)',
                      color:
                        acc.status === 'ACTIVE'
                          ? '#00e599'
                          : acc.status === 'READY TO RUN'
                          ? '#60a5fa'
                          : '#888888',
                    }}
                  >
                    {acc.status}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Right Drawer Detail View */}
      <aside
        style={{
          width: '320px',
          minWidth: '320px',
          borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: '#040607',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxSizing: 'border-box',
          fontSize: '0.8rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#00e599' }}>
            ● {selectedRow.name}
          </div>
          <button style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        <div>
          <label style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '4px' }}>
            NAME
          </label>
          <input
            type="text"
            readOnly
            value={selectedRow.name}
            style={{
              width: '100%',
              backgroundColor: '#0a0d0e',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              padding: '6px 10px',
              color: '#fff',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '4px' }}>
            KIND
          </label>
          <input
            type="text"
            readOnly
            value={selectedRow.kind}
            style={{
              width: '100%',
              backgroundColor: '#0a0d0e',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              padding: '6px 10px',
              color: '#fff',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '4px' }}>
            BROKER
          </label>
          <input
            type="text"
            readOnly
            value={selectedRow.broker}
            style={{
              width: '100%',
              backgroundColor: '#0a0d0e',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              padding: '6px 10px',
              color: '#fff',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
            }}
          />
        </div>

        <button
          style={{
            marginTop: 'auto',
            width: '100%',
            padding: '10px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Enregistrer
        </button>
      </aside>
    </div>
  )
}
