import { tv } from './theme'

interface FrozenBannerProps {
  /** ISO instant at which the figures stopped being confirmed live. */
  since: string
}

const age = (since: string) => {
  const minutes = Math.floor((Date.now() - Date.parse(since)) / 60_000)
  if (Number.isNaN(minutes)) return 'date inconnue'
  if (minutes < 1) return "il y a moins d'une minute"
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  return `il y a ${days} j`
}

/**
 * Says, unmissably, that the figures below are a snapshot.
 *
 * Restoring the last session is convenient; letting it pass for a live one is
 * how someone reads a price that has not existed for hours and acts on it. The
 * banner is loud on purpose, and states the age rather than a vague "offline".
 */
export default function FrozenBanner({ since }: FrozenBannerProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 14px',
        borderRadius: 10,
        backgroundColor: '#3A1111',
        border: '1px solid #FF6B6B',
        color: '#FF9B9B',
        fontFamily: tv.mono,
        fontSize: '0.74rem',
        fontWeight: 700,
        letterSpacing: '0.02em',
      }}
    >
      <span style={{ fontSize: '0.9rem' }}>⏸</span>
      <span>
        MOTEUR DÉCONNECTÉ — DONNÉES FIGÉES {age(since).toUpperCase()}. NE REFLÈTE
        PAS LE MARCHÉ.
      </span>
    </div>
  )
}
