import type { EquityPoint } from '../../hooks/useTradeViewWebSocket'

export interface DayStat {
  /** Local calendar day, `YYYY-MM-DD`. */
  date: string
  pnl: number
  pct: number
  trades: number
}

export const dayKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`

/**
 * Turns the cumulative equity samples into per-day results. Realized PnL is
 * cumulative since the engine started, so a day's result is the difference
 * against the previous day that has data.
 */
export function deriveDailyStats(curve: EquityPoint[]): DayStat[] {
  if (curve.length === 0) return []

  const byDay = new Map<string, EquityPoint[]>()
  for (const point of curve) {
    const key = dayKey(new Date(point.t))
    const bucket = byDay.get(key)
    if (bucket) bucket.push(point)
    else byDay.set(key, [point])
  }

  const days = [...byDay.keys()].sort()
  const stats: DayStat[] = []
  let previousRealized: number | null = null
  let previousTrades: number | null = null

  for (const date of days) {
    const points = byDay.get(date)!
    const first = points[0]
    const last = points[points.length - 1]

    const baselineRealized = previousRealized ?? first.realized
    const baselineTrades = previousTrades ?? first.trades

    const pnl = last.realized - baselineRealized
    const openingEquity = first.equity - (first.realized - baselineRealized)

    stats.push({
      date,
      pnl,
      pct: openingEquity !== 0 ? (pnl / openingEquity) * 100 : 0,
      trades: last.trades - baselineTrades,
    })

    previousRealized = last.realized
    previousTrades = last.trades
  }

  return stats
}

export interface MonthTotals {
  pnl: number
  pct: number
  trades: number
  tradedDays: number
}

export function monthTotals(stats: DayStat[], year: number, month: number): MonthTotals {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
  const inMonth = stats.filter((s) => s.date.startsWith(prefix))

  return {
    pnl: inMonth.reduce((sum, s) => sum + s.pnl, 0),
    pct: inMonth.reduce((sum, s) => sum + s.pct, 0),
    trades: inMonth.reduce((sum, s) => sum + s.trades, 0),
    tradedDays: inMonth.filter((s) => s.trades > 0).length,
  }
}

/**
 * Calendar cells for a month, Sunday-first, padded so the 1st lands on its
 * real weekday. `null` marks a padding cell.
 */
export function calendarCells(year: number, month: number): (number | null)[] {
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (number | null)[] = Array(firstWeekday).fill(null)
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}
