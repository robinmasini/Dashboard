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

export type RangeKey = 'week' | 'month' | 'year' | 'all'

/**
 * Start of a named calendar period — "this week" means since Monday, not the
 * last seven days.
 */
export function rangeStart(key: RangeKey, now = new Date()): number {
  switch (key) {
    case 'week': {
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      // getDay(): 0 = Sunday, so Sunday belongs to the week that began 6 days back.
      const offset = (monday.getDay() + 6) % 7
      monday.setDate(monday.getDate() - offset)
      return monday.getTime()
    }
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    case 'year':
      return new Date(now.getFullYear(), 0, 1).getTime()
    case 'all':
      return 0
  }
}

export interface RangeMetrics {
  realized: number
  trades: number
  wins: number
  losses: number
  openingEquity: number
  closingEquity: number
  pct: number
  tradedDays: number
}

/**
 * Metrics for a window, differenced against the last sample taken before it so
 * the period reflects its own activity rather than the whole session.
 */
export function rangeMetrics(
  curve: EquityPoint[],
  from: number,
  stats: DayStat[]
): RangeMetrics | null {
  if (curve.length === 0) return null

  const inRange = curve.filter((point) => point.t >= from)
  if (inRange.length === 0) return null

  const before = [...curve].reverse().find((point) => point.t < from)
  const first = inRange[0]
  const last = inRange[inRange.length - 1]
  const baseline = before ?? first

  const realized = last.realized - baseline.realized
  // Undo the in-window realized move to recover the equity the window opened on.
  const openingEquity = before ? before.equity : first.equity - (first.realized - baseline.realized)

  const fromKey = dayKey(new Date(from))
  const tradedDays = stats.filter((s) => s.date >= fromKey && s.trades > 0).length

  return {
    realized,
    trades: last.trades - baseline.trades,
    wins: last.wins - baseline.wins,
    losses: last.losses - baseline.losses,
    openingEquity,
    closingEquity: last.equity,
    pct: openingEquity !== 0 ? ((last.equity - openingEquity) / openingEquity) * 100 : 0,
    tradedDays,
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
