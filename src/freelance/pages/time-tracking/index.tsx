import { useState, useEffect, useRef } from 'react'
import { useTimeEntries, useTimeHistory, useActiveTimers } from '../../../shared/hooks/useSupabaseHooks'
import '../../../App.css'

const CATEGORIES = [
  { id: 'Sommeil', label: 'Sommeil', icon: '🌙', color: '#1e1b4b', iconColor: '#818cf8' },
  { id: 'Prod', label: 'Prod', icon: '💻', color: '#3b0764', iconColor: '#c084fc' },
  { id: 'Sport', label: 'Sport', icon: '🏋️', color: '#064e3b', iconColor: '#4ade80' },
  { id: 'Repas', label: 'Repas', icon: '🥗', color: '#7c2d12', iconColor: '#fb923c' },
  { id: 'Trajets', label: 'Trajets', icon: '🚗', color: '#7f1d1d', iconColor: '#f87171' },
  { id: 'Divers', label: 'Divers', icon: '🚿', color: '#1f2937', iconColor: '#9ca3af' },
]

// Helper pour formater la durée (ms -> HH:mm:ss)
const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

// Helper pour calculer la durée d'une entrée DB (HH:mm - HH:mm)
const calculateEntryDuration = (start: string, end: string): number => {
  if (!start || !end) return 0
  const [startH, startM] = start.split(':').map(Number)
  const [endH, endM] = end.split(':').map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM
  return Math.max(0, (endMinutes - startMinutes) * 60000)
}

export default function FreelanceTimeTracking() {
  // Date actuelle et date sélectionnée pour navigation
  const [today] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(today)

  const isoDate = selectedDate.toISOString().split('T')[0]
  const isToday = selectedDate.toDateString() === today.toDateString()

  // Générer les 7 derniers jours pour le sélecteur de date
  const availableDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    return date
  })

  // Entries pour la date sélectionnée + Historique complet
  const { entries, addEntry, deleteEntry } = useTimeEntries(isoDate)
  const { getDailyAverageForCategory, getHistoryByCategory, getUniqueDates } = useTimeHistory()

  // État des chronomètres synchronisé via Supabase (cross-device)
  const {
    timers,
    startTimer: startTimerDB,
    pauseTimer: pauseTimerDB,
    resetTimer: resetTimerDB
  } = useActiveTimers()

  // Force update pour l'affichage temps réel
  const [, setTick] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Timer global loop
  useEffect(() => {
    const hasRunningTimer = Object.values(timers).some(t => t.isRunning)
    if (hasRunningTimer) {
      intervalRef.current = setInterval(() => setTick(t => t + 1), 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [timers])

  // Handlers Timer - now using Supabase
  const startTimer = (categoryId: string) => {
    startTimerDB(categoryId)
  }

  const pauseTimer = (categoryId: string) => {
    pauseTimerDB(categoryId)
  }

  const validateTimer = async (categoryId: string) => {
    const timer = timers[categoryId]
    if (!timer) return

    // Calculer durée totale de la session
    let sessionDuration = timer.accumulated
    if (timer.isRunning && timer.startTime) {
      sessionDuration += (Date.now() - timer.startTime)
    }

    // Ignorer si moins d'une minute (ou gérer les secondes si on veut)
    if (sessionDuration < 60000) {
      if (!confirm("La durée est inférieure à 1 minute. Enregistrer quand même ?")) return
    }

    // Créer l'entrée DB
    const endTime = new Date()
    const startTime = new Date(endTime.getTime() - sessionDuration)

    const formatTime = (date: Date) => date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

    try {
      await addEntry({
        activity: categoryId,
        start_time: formatTime(startTime),
        end_time: formatTime(endTime),
        bilan: 'Top', // Valeur par défaut
        notes: 'Session chronométrée',
        entry_date: isoDate
      })

      // Reset timer via Supabase
      resetTimerDB(categoryId)
    } catch (error) {
      console.error("Error saving time entry:", error)
      alert("Erreur lors de l'enregistrement")
    }
  }

  // Réinitialiser le timer (sans enregistrer) - via Supabase
  const resetTimer = (categoryId: string) => {
    resetTimerDB(categoryId)
  }

  // Calcul du temps total (DB + Timer en cours)
  const getTotalTime = (categoryId: string) => {
    // 1. Temps en base
    const dbDuration = entries
      .filter(e => e.activity.startsWith(categoryId))
      .reduce((acc, curr) => acc + calculateEntryDuration(curr.start_time || '00:00', curr.end_time || '00:00'), 0)

    // 2. Temps du timer
    const timer = timers[categoryId]
    let timerDuration = 0
    if (timer) {
      timerDuration = timer.accumulated
      if (timer.isRunning && timer.startTime) {
        timerDuration += (Date.now() - timer.startTime)
      }
    }

    return formatDuration(dbDuration + timerDuration)
  }

  // Calcul du temps total en heures pour une catégorie
  const getTotalHours = (categoryId: string): number => {
    const dbDuration = entries
      .filter(e => e.activity.startsWith(categoryId))
      .reduce((acc, curr) => acc + calculateEntryDuration(curr.start_time || '00:00', curr.end_time || '00:00'), 0)

    const timer = timers[categoryId]
    let timerDuration = 0
    if (timer) {
      timerDuration = timer.accumulated
      if (timer.isRunning && timer.startTime) {
        timerDuration += (Date.now() - timer.startTime)
      }
    }

    return (dbDuration + timerDuration) / 3600000 // Convertir ms en heures
  }

  // Obtenir les alertes basées sur les seuils
  const getAlerts = () => {
    const alerts: { category: string; message: string; type: 'warning' | 'danger' | 'success' }[] = []

    CATEGORIES.forEach(cat => {
      const hours = getTotalHours(cat.id)

      // Alertes spécifiques par catégorie
      if (cat.id === 'Prod' && hours > 10) {
        alerts.push({ category: cat.label, message: `Attention: ${hours.toFixed(1)}h de travail (> 10h recommandé)`, type: 'danger' })
      } else if (cat.id === 'Sommeil' && hours < 6 && hours > 0) {
        alerts.push({ category: cat.label, message: `Attention: Seulement ${hours.toFixed(1)}h de sommeil (< 6h)`, type: 'warning' })
      } else if (cat.id === 'Sommeil' && hours >= 7 && hours <= 9) {
        alerts.push({ category: cat.label, message: `${hours.toFixed(1)}h de sommeil ✓`, type: 'success' })
      } else if (cat.id === 'Sport' && hours >= 1) {
        alerts.push({ category: cat.label, message: `${hours.toFixed(1)}h de sport 💪`, type: 'success' })
      }
    })

    return alerts
  }

  const alerts = getAlerts()

  return (
    <div className="workspace__content">
      {/* Header avec sélecteur de date */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '40px',
        paddingBottom: '20px',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>Date</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Bouton jour précédent */}
            <button
              onClick={() => {
                const newDate = new Date(selectedDate)
                newDate.setDate(selectedDate.getDate() - 1)
                setSelectedDate(newDate)
              }}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              ←
            </button>

            {/* Sélecteur de date */}
            <select
              value={isoDate}
              onChange={(e) => setSelectedDate(new Date(e.target.value + 'T12:00:00'))}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '12px 16px',
                color: 'white',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                minWidth: '250px'
              }}
            >
              {availableDates.map(date => {
                const iso = date.toISOString().split('T')[0]
                const formatted = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
                return (
                  <option key={iso} value={iso} style={{ background: '#1a1a2e' }}>
                    {formatted}
                  </option>
                )
              })}
            </select>

            {/* Bouton jour suivant */}
            <button
              onClick={() => {
                const newDate = new Date(selectedDate)
                newDate.setDate(selectedDate.getDate() + 1)
                if (newDate <= today) setSelectedDate(newDate)
              }}
              disabled={isToday}
              style={{
                background: isToday ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                color: isToday ? 'rgba(255,255,255,0.3)' : 'white',
                cursor: isToday ? 'not-allowed' : 'pointer',
                fontSize: '1rem'
              }}
            >
              →
            </button>

            {/* Bouton Aujourd'hui */}
            {!isToday && (
              <button
                onClick={() => setSelectedDate(today)}
                style={{
                  background: 'rgba(79, 124, 255, 0.2)',
                  border: '1px solid rgba(79, 124, 255, 0.3)',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  color: '#4f9dff',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 600
                }}
              >
                Aujourd'hui
              </button>
            )}
          </div>
        </div>

        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px', textAlign: 'right' }}>Bilan</p>
          <div style={{
            color: '#4ade80',
            fontSize: '1.5rem',
            fontWeight: 700,
            textAlign: 'right'
          }}>
            Satisfaisant
          </div>
        </div>
      </div>

      <div className="section-header">
        <p className="section-header__label">Time Tracking</p>
        <h1 style={{ margin: '8px 0', fontSize: '2rem', fontWeight: 700 }}>Récap quotidien</h1>
      </div>

      {/* Grid Activités */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '24px',
        marginTop: '24px'
      }}>
        {CATEGORIES.map((cat) => {
          const timer = timers[cat.id]
          const isRunning = timer?.isRunning
          const hasSession = timer && (timer.accumulated > 0 || timer.isRunning)

          return (
            <div key={cat.id} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px'
            }}>
              {/* Cercle Icône */}
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: `radial-gradient(circle at 30% 30%, ${cat.iconColor}40, ${cat.color})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                boxShadow: `0 10px 20px -5px ${cat.color}80`,
                border: `2px solid ${cat.iconColor}20`
              }}>
                {cat.icon}
              </div>

              {/* Label */}
              <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>{cat.label}</p>

              {/* Durée du jour */}
              <p style={{
                fontSize: '2rem',
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
                color: isRunning ? cat.iconColor : 'white',
                textShadow: isRunning ? `0 0 10px ${cat.iconColor}60` : 'none'
              }}>
                {getTotalTime(cat.id)}
              </p>

              {/* Moyenne quotidienne (historique) */}
              <p style={{
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                marginTop: '-8px'
              }}>
                Moyenne: <span style={{ color: cat.iconColor, fontWeight: 600 }}>
                  {getDailyAverageForCategory(cat.id)}h
                </span>/jour
              </p>

              {/* Contrôles Chrono */}
              <div style={{ display: 'flex', gap: '12px' }}>
                {!isRunning ? (
                  <button
                    onClick={() => startTimer(cat.id)}
                    title="Démarrer"
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      border: 'none',
                      background: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.2rem',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(74, 222, 128, 0.2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  >
                    ▶
                  </button>
                ) : (
                  <button
                    onClick={() => pauseTimer(cat.id)}
                    title="Pause"
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      border: 'none',
                      background: 'rgba(251, 146, 60, 0.2)',
                      color: '#fb923c',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.2rem'
                    }}
                  >
                    ⏸
                  </button>
                )}

                {hasSession && (
                  <>
                    {/* Bouton Valider */}
                    <button
                      onClick={() => validateTimer(cat.id)}
                      title="Valider la session"
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: 'none',
                        background: 'rgba(74, 222, 128, 0.2)',
                        color: '#4ade80',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.2rem'
                      }}
                    >
                      ✓
                    </button>

                    {/* Bouton Réinitialiser */}
                    <button
                      onClick={() => resetTimer(cat.id)}
                      title="Réinitialiser (annuler la session)"
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: 'none',
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#ef4444',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1rem'
                      }}
                    >
                      ↻
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Liste détaillée (optionnelle, pour voir l'historique) */}
      <div className="panel" style={{ marginTop: '40px', opacity: 0.7 }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '16px', color: 'var(--text-muted)' }}>Historique détaillé du jour</h3>
        {entries.length === 0 ? (
          <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Aucune entrée validée aujourd'hui.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {entries.map(e => (
              <div key={e.id} style={{
                padding: '6px 12px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                fontSize: '0.85rem',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <span style={{ fontWeight: 600 }}>{e.activity}</span>
                <span>{e.start_time} - {e.end_time}</span>
                <button onClick={() => deleteEntry(e.id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}>×</button>
              </div>
            ))}
          </div>
        )}

        {/* Alertes discrètes en bas de l'historique */}
        {alerts.length > 0 && (
          <div style={{
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255,255,255,0.05)'
          }}>
            {alerts.map((alert, idx) => (
              <p key={idx} style={{
                fontSize: '0.75rem',
                color: alert.type === 'danger' ? '#fca5a5' :
                  alert.type === 'warning' ? '#fdba74' : '#86efac',
                margin: '4px 0',
                opacity: 0.8
              }}>
                ⚠ {alert.message}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Historique Complet par Catégorie avec Moyennes Quotidiennes */}
      <div className="panel" style={{ marginTop: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '24px', fontWeight: 700 }}>
          📊 Moyennes Quotidiennes par Catégorie
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          {CATEGORIES.map(cat => {
            const avgHours = getDailyAverageForCategory(cat.id)
            const daysCount = getUniqueDates(cat.id).length
            const categoryHistory = getHistoryByCategory(cat.id)

            return (
              <div key={cat.id} style={{
                background: `linear-gradient(135deg, ${cat.color}, ${cat.color}80)`,
                borderRadius: '16px',
                padding: '20px',
                border: `1px solid ${cat.iconColor}30`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '1.5rem' }}>{cat.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{cat.label}</span>
                </div>

                <div style={{
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: cat.iconColor,
                  marginBottom: '8px'
                }}>
                  {avgHours}h
                </div>

                <p style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)',
                  margin: 0
                }}>
                  Moyenne quotidienne sur {daysCount} jour{daysCount > 1 ? 's' : ''}
                </p>

                {/* Mini historique des 3 dernières entrées */}
                {categoryHistory.length > 0 && (
                  <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Dernières entrées:
                    </p>
                    {categoryHistory.slice(0, 3).map((entry, idx) => (
                      <div key={idx} style={{
                        fontSize: '0.8rem',
                        color: 'rgba(255,255,255,0.7)',
                        padding: '4px 0'
                      }}>
                        {entry.entry_date} • {entry.start_time} - {entry.end_time}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
