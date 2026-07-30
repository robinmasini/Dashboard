import { useMemo, useState } from 'react'
import type { useTradeViewWebSocket } from '../../hooks/useTradeViewWebSocket'
import CapitalChart from './CapitalChart'
import DailyPnlCalendar from './DailyPnlCalendar'
import StatsPanel from './StatsPanel'
import type { RangeKey } from './dailyPnl'
import { deriveDailyStats, rangeMetrics, rangeStart } from './dailyPnl'
import { exactMoney, money, pnlColor, signedPct, tv } from './theme'

type TradeViewState = ReturnType<typeof useTradeViewWebSocket>

interface DashboardViewProps {
  tradeState: TradeViewState
}

const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'week', label: 'Cette semaine' },
  { key: 'month', label: 'Ce mois' },
  { key: 'year', label: 'Cette année' },
  { key: 'all', label: 'Depuis le début' },
]

const num = (value: string | number | undefined, fallback = 0) => {
  if (value === undefined) return fallback
  const parsed = typeof value === 'string' ? parseFloat(value) : value
  return Number.isFinite(parsed) ? parsed : fallback
}

export default function DashboardView({ tradeState }: DashboardViewProps) {
  const [range, setRange] = useState<RangeKey>('all')

  const { account, equityCurve, positions } = tradeState
  const initialCapital = num(account.initial_capital, 39_000)
  const currentCapital = num(account.current_capital, initialCapital)
  const unrealized = num(account.unrealized_pnl)
  const equity = currentCapital + unrealized

  const from = useMemo(() => rangeStart(range), [range])
  const dailyStats = useMemo(() => deriveDailyStats(equityCurve), [equityCurve])
  const observed = useMemo(
    () => rangeMetrics(equityCurve, from, dailyStats),
    [equityCurve, from, dailyStats]
  )

  // "Since inception" is answered by the engine itself, which knows the funding
  // amount and the lifetime counters. Deriving it from samples collected after
  // the page loaded would report +$0 on a reload despite a moved balance.
  const metrics = useMemo(() => {
    if (range !== 'all') return observed
    return {
      realized: num(account.realized_pnl),
      trades: account.total_trades_count || 0,
      wins: account.winning_trades_count || 0,
      losses: account.losing_trades_count || 0,
      openingEquity: initialCapital,
      closingEquity: equity,
      pct: initialCapital !== 0 ? ((equity - initialCapital) / initialCapital) * 100 : 0,
      tradedDays: observed?.tradedDays ?? (account.total_trades_count > 0 ? 1 : 0),
    }
  }, [range, observed, account, initialCapital, equity])

  const visibleCurve = useMemo(
    () => (range === 'all' ? equityCurve : equityCurve.filter((point) => point.t >= from)),
    [equityCurve, from, range]
  )

  // Everything below reflects the selected period; the capital card alone is
  // absolute, since equity is a level rather than a movement.
  const periodResult = metrics ? metrics.closingEquity - metrics.openingEquity : 0
  const periodPct = metrics?.pct ?? 0
  const baseline = metrics?.openingEquity ?? initialCapital
  const tradedDays = metrics?.tradedDays ?? 0
  const avgPerDay = tradedDays > 0 ? (metrics?.realized ?? 0) / tradedDays : 0
  const rangeLabel = RANGES.find((r) => r.key === range)!.label.toLowerCase()

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
          flexShrink: 0,
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
          {tradeState.connected ? 'Session active' : 'Moteur déconnecté'} • {tradeState.symbol}{' '}
          {tradeState.dataMode} Engine
        </div>
      </div>

      {/* Fixed-size band: the cards and the chart keep their full height, so the
          calendar below can never eat into them — it is reached by scrolling. */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          minHeight: 340,
          flexShrink: 0,
          flexWrap: 'wrap',
          alignItems: 'stretch',
        }}
      >
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
              `PnL réalisé (total)  ${exactMoney(num(account.realized_pnl))}`,
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
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.62rem',
                color: tv.textFaint,
                fontWeight: 700,
                fontFamily: tv.mono,
              }}
            >
              <span>CAPITAL</span>
              <span>USD</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: tv.mono }}>
              {money(equity)}
            </div>
          </div>

          <div
            title={[
              `Résultat — ${rangeLabel}`,
              `Équité au départ     ${money(baseline)}`,
              `Équité actuelle      ${money(equity)}`,
              `Variation            ${exactMoney(periodResult)}`,
              `Rendement            ${signedPct(periodPct)}`,
              `PnL réalisé          ${exactMoney(metrics?.realized ?? 0)}`,
              `Trades               ${metrics?.trades ?? 0}`,
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
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span
                style={{
                  fontSize: '0.62rem',
                  color: tv.textFaint,
                  fontWeight: 700,
                  fontFamily: tv.mono,
                }}
              >
                RÉSULTAT
              </span>
              <span
                style={{
                  padding: '3px 9px',
                  borderRadius: 10,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  fontFamily: tv.mono,
                  color: pnlColor(periodPct),
                  backgroundColor: periodPct >= 0 ? tv.accentSoft : tv.lossSoft,
                }}
              >
                {signedPct(periodPct)}
              </span>
            </div>
            <div
              style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                fontFamily: tv.mono,
                color: pnlColor(periodResult),
              }}
            >
              {exactMoney(periodResult)}
            </div>
          </div>
        </div>

        <CapitalChart curve={visibleCurve} initialCapital={baseline} />

        <StatsPanel
          winTrades={metrics?.wins ?? 0}
          loseTrades={metrics?.losses ?? 0}
          avgPerDay={avgPerDay}
          tradedDays={tradedDays}
          openPositions={positions.length}
        />
      </div>

      <div style={{ flexShrink: 0 }}>
        <DailyPnlCalendar stats={dailyStats} rangeFrom={from} />
      </div>
    </div>
  )
}
