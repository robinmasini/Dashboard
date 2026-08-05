import { useEffect, useMemo, useState } from 'react'
import type { useTradeViewWebSocket } from '../../hooks/useTradeViewWebSocket'
import { tv } from './theme'

type TradeViewState = ReturnType<typeof useTradeViewWebSocket>

interface WorkEntry {
  id: string
  date: string
  title: string
  body: string
}

interface NewsletterViewProps {
  tradeState: TradeViewState
}

type Section = 'travail' | 'marches'

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
  const [section, setSection] = useState<Section>('travail')
  const [work, setWork] = useState<WorkEntry[]>([])
  const [workError, setWorkError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/newsletter.json')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      .then((data) => setWork(data.entries ?? []))
      .catch((error) => setWorkError(String(error)))
  }, [])

  // Grouped by day so a session reads as a session rather than a flat list.
  const workByDay = useMemo(() => {
    const groups = new Map<string, WorkEntry[]>()
    for (const entry of work) {
      const key = entry.date.slice(0, 10)
      const bucket = groups.get(key)
      if (bucket) bucket.push(entry)
      else groups.set(key, [entry])
    }
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [work])

  const news = tradeState.news

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
          alignItems: 'center',
          gap: 4,
          backgroundColor: tv.card,
          padding: 4,
          borderRadius: 20,
          border: `1px solid ${tv.border}`,
          alignSelf: 'flex-start',
        }}
      >
        {(
          [
            ['travail', `Mon travail (${work.length})`],
            ['marches', `Marchés (${news.length})`],
          ] as const
        ).map(([key, label]) => {
          const active = section === key
          return (
            <button
              key={key}
              onClick={() => setSection(key)}
              style={{
                padding: '6px 16px',
                borderRadius: 16,
                border: 'none',
                backgroundColor: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: active ? tv.text : tv.textMuted,
                fontSize: '0.78rem',
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

      {section === 'travail' ? (
        <WorkJournal groups={workByDay} error={workError} />
      ) : (
        <MarketNews items={news} connected={tradeState.connected} />
      )}
    </div>
  )
}

function WorkJournal({
  groups,
  error,
}: {
  groups: [string, WorkEntry[]][]
  error: string | null
}) {
  if (error) {
    return <Empty text={`Journal indisponible : ${error}`} />
  }
  if (groups.length === 0) {
    return <Empty text="Aucune entrée." />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>
      {groups.map(([day, entries]) => (
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
            {dayLabel(entries[0].date)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {entries.map((entry) => (
              <article
                key={entry.id}
                style={{
                  backgroundColor: tv.card,
                  border: `1px solid ${tv.border}`,
                  borderRadius: 14,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    marginBottom: entry.body ? 8 : 0,
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700 }}>
                    {entry.title}
                  </h3>
                  <span
                    style={{
                      fontFamily: tv.mono,
                      fontSize: '0.68rem',
                      color: tv.textFaint,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {timeLabel(entry.date)} · {entry.id}
                  </span>
                </div>

                {entry.body && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.8rem',
                      lineHeight: 1.6,
                      color: tv.textMuted,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {entry.body}
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function MarketNews({
  items,
  connected,
}: {
  items: TradeViewState['news']
  connected: boolean
}) {
  if (items.length === 0) {
    return (
      <Empty
        text={
          connected
            ? "Aucune actualité reçue. Les fils d'actualité dépendent des abonnements du compte IBKR."
            : 'Moteur déconnecté — aucune actualité ne peut arriver.'
        }
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 900 }}>
      {items.map((item, index) => (
        <article
          key={`${item.article_id}-${index}`}
          style={{
            backgroundColor: tv.card,
            border: `1px solid ${tv.border}`,
            borderRadius: 14,
            padding: 16,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>{item.headline}</h3>
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
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: '0.68rem',
              fontFamily: tv.mono,
              color: tv.accent,
            }}
          >
            {item.provider}
          </div>
        </article>
      ))}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div
      style={{
        border: `1px dashed ${tv.border}`,
        borderRadius: 14,
        padding: 24,
        color: tv.textMuted,
        fontSize: '0.82rem',
        fontFamily: tv.mono,
        maxWidth: 900,
      }}
    >
      {text}
    </div>
  )
}
