import { useMemo, useState } from 'react'
import type { useTradeViewWebSocket } from '../../hooks/useTradeViewWebSocket'
import CapitalChart from './CapitalChart'
import DailyPnlCalendar from './DailyPnlCalendar'
import StatsPanel from './StatsPanel'
import { deriveDailyStats } from './dailyPnl'
import { exactMoney, money, pnlColor, signedPct, tv } from './theme'

type TradeViewState = ReturnType<typeof useTradeViewWebSocket>

interface DashboardViewProps {
  tradeState: TradeViewState
}

const RANGES = [
  { key: 'week', label: 'Cette semaine', days: 7 },
  { key: 'month', label: 'Ce mois', days: 30 },
  { key: 'year', label: 'Cette année', days: 365 },
  { key: 'all', label: 'Depuis le début', days: Infinity },
] as const

const num = (value: string | number | undefined, fallback = 0) => {
  if (value === undefined) return fallback
  const parsed = typeof value === 'string' ? parseFloat(value) : value
  return Number.isFinite(parsed) ? parsed : fallback
}

export default function DashboardView({ tradeState }: DashboardViewProps) {
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>('all')

  const { account, equityCurve, positions } = tradeState
  const initialCapital = num(account.initial_capital, 100_000)
  const currentCapital = num(account.current_capital, initialCapital)
  const unrealized = num(account.unrealized_pnl)
  const equity = currentCapital + unrealized
  const progressPct =
    initialCapital !== 0 ? ((equity - initialCapital) / initialCapital) * 100 : 0

  const visibleCurve = useMemo(() => {
    const days = RANGES.find((r) => r.key === range)!.days
    if (!Number.isFinite(days)) return equityCurve
    const cutoff = Date.now() - days * 86_400_000
    return equityCurve.filter((point) => point.t >= cutoff)
  }, [equityCurve, range])

  const dailyStats = useMemo(() => deriveDailyStats(equityCurve), [equityCurve])
  const tradedDays = dailyStats.filter((s) => s.trades > 0).length
  const totalRealized = dailyStats.reduce((sum, s) => sum + s.pnl, 0)
  const avgPerDay = tradedDays > 0 ? totalRealized / tradedDays : 0

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: 24,
        backgroundColor: tv.bg,
        color: tv.text,
        height: 'calc(100vh - 60px)',
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            backgroundColor: tv.card,
            padding: 4,
            borderRadius: 20,
            border: `1px solid ${tv.border}`,
          }}
        >
          {RANGES.map(({ key, label }) => {
            const active = range === key
            return (
              <button
                key={key}
                onClick={() => setRange(key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 16,
                  border: 'none',
                  backgroundColor: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: active ? tv.text : tv.textMuted,
                  fontSize: '0.76rem',
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        <div style={{ fontSize: '0.72rem', color: tv.textFaint, fontFamily: tv.mono }}>
          {tradeState.connected ? 'Session active' : 'Moteur déconnecté'} •{' '}
          {tradeState.symbol} {tradeState.dataMode} Engine
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, height: 330, flexWrap: 'wrap' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            width: 220,
            flexShrink: 0,
          }}
        >
          <div
            title={[
              'Capital courant (équité)',
              `Capital de départ    ${money(initialCapital)}`,
              `PnL réalisé          ${exactMoney(num(account.realized_pnl))}`,
              `PnL latent           ${exactMoney(unrealized)}`,
              `Équité               ${money(equity)}`,
            ].join('\n')}
            style={{
              flex: 1,
              backgroundColor: tv.card,
              border: `1px solid ${tv.border}`,
              borderRadius: 16,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              cursor: 'help',
            }}
          >
            <div
              style={{
                fontSize: '0.62rem',
                color: tv.textFaint,
                fontWeight: 700,
                fontFamily: tv.mono,
                textAlign: 'right',
              }}
            >
              USD
            </div>
            <div style={{ fontSize: '1.55rem', fontWeight: 800, fontFamily: tv.mono }}>
              {money(equity)}
            </div>
          </div>

          <div
            title={[
              'Résultat depuis le départ',
              `Gain / perte         ${exactMoney(equity - initialCapital)}`,
              `Rendement            ${signedPct(progressPct)}`,
              `Trades gagnants      ${account.winning_trades_count || 0}`,
              `Trades perdants      ${account.losing_trades_count || 0}`,
              `Jours tradés         ${tradedDays}`,
            ].join('\n')}
            style={{
              flex: 1,
              backgroundColor: tv.card,
              border: `1px solid ${tv.border}`,
              borderRadius: 16,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              cursor: 'help',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <span
                style={{
                  padding: '3px 9px',
                  borderRadius: 10,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  fontFamily: tv.mono,
                  color: pnlColor(progressPct),
                  backgroundColor: progressPct >= 0 ? tv.accentSoft : tv.lossSoft,
                }}
              >
                {signedPct(progressPct)}
              </span>
            </div>
            <div
              style={{
                fontSize: '1.55rem',
                fontWeight: 800,
                fontFamily: tv.mono,
                color: pnlColor(equity - initialCapital),
              }}
            >
              {money(equity - initialCapital)}
            </div>
          </div>
        </div>

        <CapitalChart curve={visibleCurve} initialCapital={initialCapital} />

        <StatsPanel
          winTrades={account.winning_trades_count || 0}
          loseTrades={account.losing_trades_count || 0}
          avgPerDay={avgPerDay}
          tradedDays={tradedDays}
          openPositions={positions.length}
        />
      </div>

      <DailyPnlCalendar stats={dailyStats} />
    </div>
  )
}
