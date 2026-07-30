import { useMemo, useState } from 'react'
import type { DayStat } from './dailyPnl'
import { calendarCells, monthTotals } from './dailyPnl'
import { exactMoney, longDate, pnlColor, signedMoney, signedPct, tv } from './theme'

const WEEKDAYS = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM']
const MONTHS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
]

interface DailyPnlCalendarProps {
  stats: DayStat[]
}

export default function DailyPnlCalendar({ stats }: DailyPnlCalendarProps) {
  const now = new Date()
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() })

  const byDate = useMemo(() => {
    const map = new Map<string, DayStat>()
    for (const stat of stats) map.set(stat.date, stat)
    return map
  }, [stats])

  const totals = monthTotals(stats, cursor.year, cursor.month)
  const cells = calendarCells(cursor.year, cursor.month)
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`

  const shiftMonth = (delta: number) => {
    setCursor((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  return (
    <div
      style={{
        backgroundColor: tv.card,
        border: `1px solid ${tv.border}`,
        borderRadius: 18,
        padding: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <NavButton label="‹" onClick={() => shiftMonth(-1)} />
          <span style={{ fontSize: '1rem', fontWeight: 700, minWidth: 150 }}>
            {MONTHS[cursor.month]} {cursor.year}
          </span>
          <NavButton label="›" onClick={() => shiftMonth(1)} />
        </div>

        <div
          style={{
            display: 'flex',
            gap: 14,
            fontFamily: tv.mono,
            fontSize: '0.72rem',
            flexWrap: 'wrap',
          }}
        >
          <Total label="PRG" value={signedPct(totals.pct)} color={pnlColor(totals.pct)} />
          <Total label="PNL" value={signedMoney(totals.pnl)} color={pnlColor(totals.pnl)} />
          <Total label="TRD" value={String(totals.trades)} color={tv.text} />
          <Total label="JOURS" value={String(totals.tradedDays)} color={tv.text} />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 560 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 6,
              marginBottom: 6,
            }}
          >
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  color: tv.textFaint,
                  fontFamily: tv.mono,
                  padding: '0 4px 4px',
                }}
              >
                {day}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
            {cells.map((day, index) => {
              if (day === null) {
                return <div key={`pad-${index}`} />
              }

              const date = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-${String(
                day
              ).padStart(2, '0')}`
              const stat = byDate.get(date)
              const isToday = date === todayKey

              const tooltip = stat
                ? [
                    longDate(date),
                    `PnL réalisé   ${exactMoney(stat.pnl)}`,
                    `Rendement     ${signedPct(stat.pct)}`,
                    `Trades        ${stat.trades}`,
                  ].join('\n')
                : `${longDate(date)}\nAucun trade enregistré`

              return (
                <div
                  key={date}
                  title={tooltip}
                  style={{
                    minHeight: 74,
                    cursor: stat ? 'help' : 'default',
                    borderRadius: 12,
                    padding: 8,
                    backgroundColor: stat ? tv.cardRaised : 'rgba(255,255,255,0.015)',
                    border: `1px solid ${isToday ? tv.borderStrong : tv.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.62rem',
                      color: isToday ? tv.text : tv.textFaint,
                      fontFamily: tv.mono,
                      textAlign: 'right',
                      fontWeight: isToday ? 700 : 400,
                    }}
                  >
                    {day}
                  </div>

                  {stat ? (
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          fontFamily: tv.mono,
                          color: pnlColor(stat.pnl),
                        }}
                      >
                        {signedMoney(stat.pnl)}
                      </span>
                      <span
                        style={{
                          fontSize: '0.62rem',
                          fontFamily: tv.mono,
                          color: tv.textMuted,
                        }}
                      >
                        {signedPct(stat.pct)}
                      </span>
                    </div>
                  ) : (
                    <div style={{ flex: 1 }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {stats.length === 0 && (
        <div
          style={{
            marginTop: 16,
            fontSize: '0.72rem',
            color: tv.textFaint,
            fontFamily: tv.mono,
            textAlign: 'center',
          }}
        >
          Aucun jour tradé enregistré — l'historique se remplit à mesure que le moteur exécute
        </div>
      )}
    </div>
  )
}

function NavButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 26,
        height: 26,
        borderRadius: 8,
        border: `1px solid ${tv.border}`,
        backgroundColor: 'transparent',
        color: tv.textMuted,
        cursor: 'pointer',
        fontSize: '0.9rem',
        lineHeight: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {label}
    </button>
  )
}

function Total({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span style={{ display: 'flex', gap: 5, alignItems: 'baseline' }}>
      <span style={{ color: tv.textFaint, fontWeight: 700 }}>{label}</span>
      <span style={{ color, fontWeight: 700 }}>{value}</span>
    </span>
  )
}
