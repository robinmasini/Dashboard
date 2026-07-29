import { useState, useEffect } from 'react'
import AccountSelector from './AccountSelector'
import type { useTradeViewWebSocket } from '../../hooks/useTradeViewWebSocket'

type TradeViewState = ReturnType<typeof useTradeViewWebSocket>

interface HeaderGlobalProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  tradeState: TradeViewState
}

export default function HeaderGlobal({
  activeTab,
  setActiveTab,
  tradeState,
}: HeaderGlobalProps) {
  const [selectedAccount, setSelectedAccount] = useState<string>('demo-paper-100k')
  const [marketTime, setMarketTime] = useState<string>('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setMarketTime(
        now.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const unrealizedPnl = parseFloat(String(tradeState.account.unrealized_pnl || 0))
  const isPnlPositive = unrealizedPnl >= 0

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '60px',
        padding: '0 24px',
        backgroundColor: '#050708',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        color: '#ffffff',
        boxSizing: 'border-box',
      }}
    >
      {/* Left Group: Account Selector, Status Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <AccountSelector
          selectedId={selectedAccount}
          onSelect={(acc) => setSelectedAccount(acc.id)}
        />

        {/* Live Market Mode Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '12px',
            backgroundColor: tradeState.connected ? 'rgba(0, 229, 153, 0.12)' : 'rgba(255, 77, 77, 0.12)',
            border: `1px solid ${tradeState.connected ? '#00e59944' : '#ff4d4d44'}`,
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            fontWeight: 600,
            color: tradeState.connected ? '#00e599' : '#ff4d4d',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: tradeState.connected ? '#00e599' : '#ff4d4d',
            }}
          />
          <span>{tradeState.connected ? tradeState.dataMode : 'DÉCONNECTÉ'}</span>
        </div>

        {/* Symbol Indicator */}
        <div
          style={{
            fontSize: '0.85rem',
            fontWeight: 700,
            letterSpacing: '1px',
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          {tradeState.symbol}
        </div>
      </div>

      {/* Center Group: Tabs Navigation (Dashboard, Market, Data) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#0d1113',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: '3px',
          gap: '4px',
        }}
      >
        {[
          { id: 'Dashboard', label: 'Dashboard', icon: '📊' },
          { id: 'Market', label: 'Market', icon: '📈' },
          { id: 'Data', label: 'Data', icon: '⚡' },
        ].map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 16px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
                fontSize: '0.8rem',
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Right Group: Clock, Latent PnL badge, Reset button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          <span>EN VEILLE</span>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
          <span>{marketTime}</span>
        </div>

        {/* Dynamic Latent PnL Badge */}
        <div
          style={{
            padding: '4px 12px',
            borderRadius: '12px',
            backgroundColor: isPnlPositive ? 'rgba(0, 229, 153, 0.15)' : 'rgba(255, 77, 77, 0.15)',
            color: isPnlPositive ? '#00e599' : '#ff4d4d',
            fontSize: '0.8rem',
            fontFamily: 'monospace',
            fontWeight: 700,
          }}
        >
          {isPnlPositive ? '+' : ''}${unrealizedPnl.toFixed(2)}
        </div>

        <button
          onClick={() => tradeState.resetAccount()}
          title="Réinitialiser le compte SIM à $100,000"
          style={{
            padding: '4px 10px',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: '#ffffff',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          RESET SIM
        </button>
      </div>
    </header>
  )
}
