export const tv = {
  bg: '#000000',
  card: '#0A0C0D',
  cardRaised: '#101314',
  border: 'rgba(255, 255, 255, 0.07)',
  borderStrong: 'rgba(255, 255, 255, 0.14)',
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.45)',
  textFaint: 'rgba(255, 255, 255, 0.26)',
  /** Sampled from the TradeView logo: blue marks a gain, violet a loss. */
  accent: '#789CFC',
  accentDeep: '#3C6CD8',
  accentSoft: 'rgba(120, 156, 252, 0.16)',
  loss: '#A854FC',
  lossDeep: '#783CA8',
  lossSoft: 'rgba(168, 84, 252, 0.16)',
  mono: "'SF Mono', ui-monospace, 'JetBrains Mono', Menlo, monospace",
} as const

/** Signed money, SILO-style: thin space thousands, sign always visible. */
export function signedMoney(value: number, currency = '$'): string {
  const sign = value >= 0 ? '+' : '-'
  const abs = Math.abs(value)
  if (abs >= 1000) {
    return `${sign}${currency}${(abs / 1000).toFixed(abs >= 10_000 ? 0 : 1)}k`
  }
  return `${sign}${currency}${abs.toFixed(0)}`
}

export function money(value: number, currency = '$'): string {
  return `${currency} ${value.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * Axis labels sized to the span on screen. Collapsing to `k` is only safe when
 * the range is wide enough; on a $10 move it would print the same tick several
 * times over.
 */
export function makeAxisFormatter(span: number, currency = '$') {
  const decimals =
    span >= 20_000 ? 0 : span >= 2_000 ? 1 : span >= 200 ? 2 : span >= 20 ? 3 : 4
  return (v: number) => `${currency}${(v / 1000).toFixed(decimals)}k`
}

export function signedPct(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

/** Exact amount, no k-rounding — for tooltips and anything read as a figure. */
export function exactMoney(value: number, currency = '$'): string {
  const sign = value >= 0 ? '+' : '-'
  return `${sign}${currency}${Math.abs(value).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function fullDateTime(t: number): string {
  return new Date(t).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function longDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export const pnlColor = (value: number) => (value >= 0 ? tv.accent : tv.loss)
