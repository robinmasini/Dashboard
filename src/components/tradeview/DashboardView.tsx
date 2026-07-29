import { useState } from 'react'
import type { useTradeViewWebSocket } from '../../hooks/useTradeViewWebSocket'

type TradeViewState = ReturnType<typeof useTradeViewWebSocket>

interface DashboardViewProps {
  tradeState: TradeViewState
}

export default function DashboardView({ tradeState }: DashboardViewProps) {
  const [filter, setFilter] = useState<'week' | 'month' | 'year' | 'all'>('all')

  const currentCapital = parseFloat(String(tradeState.account.current_capital || 100000))
  const realizedPnl = parseFloat(String(tradeState.account.realized_pnl || 0))
  const totalTrades = tradeState.account.total_trades_count || 0
  const winTrades = tradeState.account.winning_trades_count || 0
  const loseTrades = tradeState.account.losing_trades_count || 0
  const winRate = totalTrades > 0 ? ((winTrades / totalTrades) * 100).toFixed(1) : '0.0'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '24px',
        backgroundColor: '#000000',
        color: '#ffffff',
        height: 'calc(100vh - 60px)',
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#050708',
            padding: '4px',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {['Cette semaine', 'Ce mois', 'Cette année', 'Depuis le début'].map((label, idx) => {
            const keys = ['week', 'month', 'year', 'all'] as const
            const isSelected = filter === keys[idx]
            return (
              <button
                key={label}
                onClick={() => setFilter(keys[idx])}
                style={{
                  padding: '6px 16px',
                  borderRadius: '16px',
                  border: 'none',
                  backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                  color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
                  fontSize: '0.8rem',
                  fontWeight: isSelected ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
          Session active • NVDA Scalping SIM Engine
        </div>
      </div>

      {/* Main KPI & Chart Row */}
      <div style={{ display: 'flex', gap: '20px', height: '320px' }}>
        {/* Left Column KPIs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '220px' }}>
          {/* Capital Card */}
          <div
            style={{
              flex: 1,
              backgroundColor: '#040607',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
              CAPITAL SIM (USD)
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'monospace' }}>
              ${currentCapital.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Realized PnL Card */}
          <div
            style={{
              flex: 1,
              backgroundColor: '#040607',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
              PNL RÉALISÉ
            </div>
            <div
              style={{
                fontSize: '1.6rem',
                fontWeight: 800,
                color: realizedPnl >= 0 ? '#00e599' : '#ff4d4d',
                fontFamily: 'monospace',
              }}
            >
              {realizedPnl >= 0 ? '+' : ''}${realizedPnl.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Right Chart Card */}
        <div
          style={{
            flex: 1,
            backgroundColor: '#040607',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '20px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <span
              style={{
                padding: '4px 12px',
                borderRadius: '12px',
                backgroundColor: '#ffffff',
                color: '#000000',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              Capital Evolution
            </span>
          </div>

          <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
              Graphique en temps réel alimenté par les exécutions Rust
            </span>
          </div>
        </div>
      </div>

      {/* Summary Metrics Panel */}
      <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
        <div
          style={{
            flex: 1,
            backgroundColor: '#040607',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
              WIN RATE
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#00e599', fontFamily: 'monospace', margin: '4px 0' }}>
              {winRate}%
            </div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
              {winTrades}W / {loseTrades}L ({totalTrades} trades)
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
              POSITIONS OUVERTES
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', fontFamily: 'monospace', margin: '4px 0' }}>
              {tradeState.positions.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
