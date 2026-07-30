import { useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { EquityPoint } from '../../hooks/useTradeViewWebSocket'
import { exactMoney, fullDateTime, makeAxisFormatter, money, pnlColor, signedPct, tv } from './theme'

type Mode = 'capital' | 'performance'

interface ChartPoint {
  t: number
  capital: number
  performance: number
  realized: number
  trades: number
}

function ChartTooltip({
  active,
  payload,
  initialCapital,
}: {
  active?: boolean
  payload?: { payload: ChartPoint }[]
  initialCapital: number
}) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0].payload
  const delta = point.capital - initialCapital

  return (
    <div
      style={{
        backgroundColor: tv.cardRaised,
        border: `1px solid ${tv.borderStrong}`,
        borderRadius: 10,
        padding: '10px 12px',
        fontFamily: tv.mono,
        fontSize: '0.72rem',
        minWidth: 210,
      }}
    >
      <div style={{ color: tv.textMuted, marginBottom: 8, fontSize: '0.68rem' }}>
        {fullDateTime(point.t)}
      </div>
      <Row label="Capital" value={money(point.capital)} color={tv.text} />
      <Row label="Variation" value={exactMoney(delta)} color={pnlColor(delta)} />
      <Row
        label="Performance"
        value={signedPct(point.performance)}
        color={pnlColor(point.performance)}
      />
      <Row label="PnL réalisé" value={exactMoney(point.realized)} color={pnlColor(point.realized)} />
      <Row label="Trades clôturés" value={String(point.trades)} color={tv.textMuted} />
    </div>
  )
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, lineHeight: 1.7 }}>
      <span style={{ color: tv.textFaint }}>{label}</span>
      <span style={{ color, fontWeight: 700 }}>{value}</span>
    </div>
  )
}

interface CapitalChartProps {
  curve: EquityPoint[]
  initialCapital: number
}

const timeLabel = (t: number) =>
  new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

export default function CapitalChart({ curve, initialCapital }: CapitalChartProps) {
  const [mode, setMode] = useState<Mode>('capital')

  const data: ChartPoint[] = curve.map((point) => ({
    t: point.t,
    capital: point.equity,
    performance:
      initialCapital !== 0 ? ((point.equity - initialCapital) / initialCapital) * 100 : 0,
    realized: point.realized,
    trades: point.trades,
  }))

  const key = mode === 'capital' ? 'capital' : 'performance'
  const values = data.map((d) => d[key])
  const current = values.length > 0 ? values[values.length - 1] : initialCapital
  const min = values.length > 0 ? Math.min(...values) : 0
  const max = values.length > 0 ? Math.max(...values) : 1
  const pad = (max - min) * 0.15 || Math.abs(max) * 0.02 || 1

  const isUp = mode === 'capital' ? current >= initialCapital : current >= 0
  const stroke = isUp ? tv.accent : tv.loss

  const span = max - min
  const axisMoneyFmt = makeAxisFormatter(span)
  const pctDecimals = span >= 5 ? 1 : span >= 0.5 ? 2 : 3
  const format = (value: number) =>
    mode === 'capital' ? axisMoneyFmt(value) : `${value.toFixed(pctDecimals)}%`

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: tv.card,
        border: `1px solid ${tv.border}`,
        borderRadius: 18,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {(['capital', 'performance'] as const).map((option) => {
          const active = mode === option
          return (
            <button
              key={option}
              onClick={() => setMode(option)}
              style={{
                padding: '5px 14px',
                borderRadius: 14,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: active ? tv.text : 'transparent',
                color: active ? '#000000' : tv.textMuted,
                fontSize: '0.72rem',
                fontWeight: active ? 700 : 500,
                textTransform: 'capitalize',
              }}
            >
              {option === 'capital' ? 'Capital' : 'Performance'}
            </button>
          )
        })}
      </div>

      {data.length < 2 ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: tv.textMuted, fontFamily: tv.mono }}>
            En attente d'exécutions du moteur
          </span>
          <span style={{ fontSize: '0.7rem', color: tv.textFaint, fontFamily: tv.mono }}>
            La courbe se construit dès que le compte bouge
          </span>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 74, bottom: 4, left: 4 }}>
              <defs>
                <linearGradient id="tvCapitalFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke="rgba(255,255,255,0.04)"
                vertical={false}
                strokeDasharray="0"
              />

              <XAxis
                dataKey="t"
                tickFormatter={timeLabel}
                axisLine={false}
                tickLine={false}
                minTickGap={48}
                tick={{ fill: tv.textFaint, fontSize: 10, fontFamily: tv.mono }}
              />
              <YAxis
                orientation="right"
                domain={[min - pad, max + pad]}
                tickFormatter={format}
                axisLine={false}
                tickLine={false}
                width={70}
                tick={{ fill: tv.textFaint, fontSize: 10, fontFamily: tv.mono }}
              />

              <Tooltip
                content={<ChartTooltip initialCapital={initialCapital} />}
                cursor={{ stroke: tv.borderStrong, strokeWidth: 1 }}
              />

              <ReferenceLine
                y={current}
                stroke={stroke}
                strokeDasharray="3 3"
                strokeOpacity={0.35}
                label={{
                  value: format(current),
                  position: 'right',
                  fill: '#000000',
                  fontSize: 10,
                  fontFamily: tv.mono,
                  fontWeight: 700,
                }}
              />

              <Area
                type="linear"
                dataKey={key}
                stroke={stroke}
                strokeWidth={2}
                fill="url(#tvCapitalFill)"
                dot={false}
                activeDot={{ r: 3, fill: stroke, stroke: 'none' }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
