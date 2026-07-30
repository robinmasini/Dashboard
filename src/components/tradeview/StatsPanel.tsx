import { pnlColor, signedMoney, tv } from './theme'

interface StatsPanelProps {
  winTrades: number
  loseTrades: number
  avgPerDay: number
  tradedDays: number
  openPositions: number
}

export default function StatsPanel({
  winTrades,
  loseTrades,
  avgPerDay,
  tradedDays,
  openPositions,
}: StatsPanelProps) {
  const total = winTrades + loseTrades
  const winRate = total > 0 ? (winTrades / total) * 100 : 0

  return (
    <div
      style={{
        width: 210,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <Card label="WIN RATE">
        <Donut percent={winRate} color={tv.accent} />
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: tv.mono }}>
            {winRate.toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.65rem', color: tv.textFaint, fontFamily: tv.mono }}>
            {winTrades}W / {loseTrades}L
          </div>
        </div>
      </Card>

      <Card label="GAIN MOY / JOUR">
        <div
          style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            fontFamily: tv.mono,
            color: pnlColor(avgPerDay),
            textAlign: 'center',
          }}
        >
          {signedMoney(avgPerDay)}
        </div>
        <div
          style={{
            fontSize: '0.65rem',
            color: tv.textFaint,
            fontFamily: tv.mono,
            textAlign: 'center',
            marginTop: 4,
          }}
        >
          {tradedDays} {tradedDays === 1 ? 'jour' : 'jours'}
        </div>
      </Card>

      <Card label="POSITIONS OUVERTES">
        <div
          style={{
            fontSize: '1.8rem',
            fontWeight: 800,
            fontFamily: tv.mono,
            textAlign: 'center',
          }}
        >
          {openPositions}
        </div>
      </Card>
    </div>
  )
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: tv.card,
        border: `1px solid ${tv.border}`,
        borderRadius: 16,
        padding: 16,
      }}
    >
      <div
        style={{
          fontSize: '0.6rem',
          fontWeight: 700,
          color: tv.textFaint,
          fontFamily: tv.mono,
          textAlign: 'right',
          marginBottom: 10,
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}

function Donut({ percent, color }: { percent: number; color: string }) {
  const size = 68
  const stroke = 7
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  return (
    <svg
      width={size}
      height={size}
      style={{ display: 'block', margin: '0 auto', transform: 'rotate(-90deg)' }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - percent / 100)}
      />
    </svg>
  )
}
