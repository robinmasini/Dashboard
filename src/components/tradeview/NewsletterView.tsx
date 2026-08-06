import { useMemo } from 'react'
import type { useTradeViewWebSocket } from '../../hooks/useTradeViewWebSocket'
import { tv } from './theme'

type TradeViewState = ReturnType<typeof useTradeViewWebSocket>

interface NewsletterViewProps {
  tradeState: TradeViewState
}

const dayLabel = (iso: string) => {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (same(date, today)) return "Aujourd'hui"
  if (same(date, yesterday)) return 'Hier'
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

export default function NewsletterView({ tradeState }: NewsletterViewProps) {
  // Grouped by day so the session's context reads as a session.
  const byDay = useMemo(() => {
    const groups = new Map<string, TradeViewState['news']>()
    for (const item of tradeState.news) {
      const key = item.timestamp.slice(0, 10)
      const bucket = groups.get(key)
      if (bucket) bucket.push(item)
      else groups.set(key, [item])
    }
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [tradeState.news])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
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
          alignItems: 'baseline',
          maxWidth: 900,
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Actualité des marchés</h2>
        <span style={{ fontSize: '0.72rem', color: tv.textFaint, fontFamily: tv.mono }}>
          {tradeState.news.length} dépêches ·{' '}
          {tradeState.connected ? 'flux actif' : 'moteur déconnecté'}
        </span>
      </div>

      {byDay.length === 0 ? (
        <div
          style={{
            border: `1px dashed ${tv.border}`,
            borderRadius: 14,
            padding: 24,
            color: tv.textMuted,
            fontSize: '0.82rem',
            fontFamily: tv.mono,
            maxWidth: 900,
            lineHeight: 1.7,
          }}
        >
          {tradeState.connected
            ? "Aucune dépêche reçue. Les fils dépendent des abonnements du compte IBKR — ce compte lit Briefing.com et Dow Jones Newsletters."
            : 'Moteur déconnecté — aucune dépêche ne peut arriver.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>
          {byDay.map(([day, items]) => (
            <div key={day}>
              <div
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: tv.textFaint,
                  fontFamily: tv.mono,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 10,
                }}
              >
                {dayLabel(items[0].timestamp)}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((item, index) => (
                  <article
                    key={`${item.article_id}-${index}`}
                    style={{
                      backgroundColor: tv.card,
                      border: `1px solid ${tv.border}`,
                      borderRadius: 14,
                      padding: '14px 16px',
                      display: 'flex',
                      gap: 14,
                      alignItems: 'baseline',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: tv.mono,
                        fontSize: '0.68rem',
                        color: tv.textFaint,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {timeLabel(item.timestamp)}
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, lineHeight: 1.45 }}>
                        {item.headline}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: '0.66rem',
                          fontFamily: tv.mono,
                          color: tv.accent,
                        }}
                      >
                        {item.provider}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
