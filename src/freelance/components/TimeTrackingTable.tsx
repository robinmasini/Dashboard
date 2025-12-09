import type { TimeTrackingEntry } from '../../data/dashboard'

type TimeTrackingTableProps = {
  entries: TimeTrackingEntry[]
  onUpdate: (id: string, field: keyof TimeTrackingEntry, value: string) => void
  onDelete: (id: string) => void
  onAdd: () => void
}

const validateTimeFormat = (time: string): boolean => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  return timeRegex.test(time)
}

const formatTimeInput = (value: string): string => {
  // Si la valeur est vide, retourner vide
  if (!value) return ''
  
  // Supprimer tout sauf les chiffres
  const numbers = value.replace(/\D/g, '')
  
  // Si pas de chiffres, retourner vide
  if (!numbers) return ''
  
  // Limiter à 4 chiffres
  const limited = numbers.slice(0, 4)
  
  // Ajouter le séparateur :
  if (limited.length <= 2) {
    return limited
  }
  return `${limited.slice(0, 2)}:${limited.slice(2)}`
}

const parseTime = (time: string): { hours: number; minutes: number } | null => {
  // Si le format est valide, parser normalement
  if (validateTimeFormat(time)) {
    const [hours, minutes] = time.split(':').map(Number)
    return { hours, minutes }
  }
  
  // Sinon, essayer de parser des valeurs partielles (ex: "12", "123", "1234")
  const numbers = time.replace(/\D/g, '')
  if (numbers.length === 0) return null
  
  if (numbers.length === 1) {
    return { hours: parseInt(numbers[0]), minutes: 0 }
  } else if (numbers.length === 2) {
    return { hours: parseInt(numbers), minutes: 0 }
  } else if (numbers.length === 3) {
    return { hours: parseInt(numbers[0]), minutes: parseInt(numbers.slice(1)) }
  } else if (numbers.length >= 4) {
    return { hours: parseInt(numbers.slice(0, 2)), minutes: parseInt(numbers.slice(2, 4)) }
  }
  
  return null
}

const calculateDuration = (startTime: string, endTime: string): string => {
  const start = parseTime(startTime)
  const end = parseTime(endTime)
  
  // Si l'un des deux n'est pas parsable, retourner 0:00
  if (!start || !end) {
    return '0:00'
  }

  if (start.hours === 0 && start.minutes === 0 && end.hours === 0 && end.minutes === 0) {
    return '0:00'
  }

  let startTotalMinutes = start.hours * 60 + start.minutes
  let endTotalMinutes = end.hours * 60 + end.minutes

  // Gérer le cas où l'événement traverse minuit
  if (endTotalMinutes < startTotalMinutes) {
    endTotalMinutes += 24 * 60 // Ajouter 24 heures
  }

  const durationMinutes = endTotalMinutes - startTotalMinutes
  
  // Si la durée est négative, retourner 0:00
  if (durationMinutes < 0) {
    return '0:00'
  }
  
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60

  return `${hours}:${minutes.toString().padStart(2, '0')}`
}

const getDurationColor = (duration: string): string => {
  if (duration === '0:00') return 'var(--text-muted)'
  
  const [hours, minutes] = duration.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes
  
  // Durées en rouge si > 6h ou certaines conditions
  if (totalMinutes > 360) return '#ff6b6b' // Rouge pour > 6h
  if (totalMinutes === 0) return 'var(--text-muted)'
  return '#51cf66' // Vert pour les autres
}

const TimeTrackingTable = ({ entries, onUpdate, onDelete, onAdd }: TimeTrackingTableProps) => {
  // Vérifier que les props sont bien reçues
  if (!entries || entries.length === 0) {
    return (
      <section className="panel time-tracking-table">
        <header className="panel__header">
          <p>Suivi du temps</p>
          <button type="button" className="primary-button subtle" onClick={onAdd}>
            + Ajouter un évènement
          </button>
        </header>
        <div className="time-tracking-table__container">
          <p style={{ padding: '20px', color: 'var(--text-muted)' }}>Aucune entrée. Cliquez sur "Ajouter un évènement" pour commencer.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="panel time-tracking-table">
      <header className="panel__header">
        <p>Suivi du temps</p>
        <button type="button" className="primary-button subtle" onClick={onAdd}>
          + Ajouter un évènement
        </button>
      </header>
      <div className="time-tracking-table__container">
        <table className="time-tracking-table__table">
          <thead>
            <tr>
              <th>Activité</th>
              <th>Heure de début</th>
              <th>Heure de fin</th>
              <th>Durée totale</th>
              <th>BILAN</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const duration = calculateDuration(entry.startTime, entry.endTime)
              const durationColor = getDurationColor(duration)
              
              return (
                <tr key={entry.id}>
                  <td>
                    <input
                      type="text"
                      value={entry.activity}
                      onChange={(e) => onUpdate(entry.id, 'activity', e.target.value)}
                      className="time-tracking-table__input"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={entry.startTime}
                      onChange={(e) => {
                        const newValue = e.target.value
                        const formatted = formatTimeInput(newValue)
                        onUpdate(entry.id, 'startTime', formatted)
                      }}
                      onBlur={(e) => {
                        const value = e.target.value.trim()
                        // Si vide, mettre 00:00
                        if (!value) {
                          onUpdate(entry.id, 'startTime', '00:00')
                          return
                        }
                        // Si le format n'est pas valide, essayer de le corriger
                        if (!validateTimeFormat(value)) {
                          const formatted = formatTimeInput(value)
                          if (validateTimeFormat(formatted)) {
                            onUpdate(entry.id, 'startTime', formatted)
                          } else {
                            // Si toujours invalide, remettre la valeur précédente
                            onUpdate(entry.id, 'startTime', entry.startTime)
                          }
                        }
                      }}
                      placeholder="HH:mm"
                      maxLength={5}
                      className="time-tracking-table__input time-tracking-table__input--time"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={entry.endTime}
                      onChange={(e) => {
                        const newValue = e.target.value
                        const formatted = formatTimeInput(newValue)
                        onUpdate(entry.id, 'endTime', formatted)
                      }}
                      onBlur={(e) => {
                        const value = e.target.value.trim()
                        // Si vide, mettre 00:00
                        if (!value) {
                          onUpdate(entry.id, 'endTime', '00:00')
                          return
                        }
                        // Si le format n'est pas valide, essayer de le corriger
                        if (!validateTimeFormat(value)) {
                          const formatted = formatTimeInput(value)
                          if (validateTimeFormat(formatted)) {
                            onUpdate(entry.id, 'endTime', formatted)
                          } else {
                            // Si toujours invalide, remettre la valeur précédente
                            onUpdate(entry.id, 'endTime', entry.endTime)
                          }
                        }
                      }}
                      placeholder="HH:mm"
                      maxLength={5}
                      className="time-tracking-table__input time-tracking-table__input--time"
                    />
                  </td>
                  <td>
                    <span style={{ color: durationColor, fontWeight: 600 }}>
                      {duration}
                    </span>
                  </td>
                  <td>
                    <select
                      value={entry.bilan}
                      onChange={(e) => {
                        const newBilan = e.target.value as TimeTrackingEntry['bilan']
                        onUpdate(entry.id, 'bilan', newBilan)
                      }}
                      className={`time-tracking-table__select time-tracking-table__select--${entry.bilan.toLowerCase().replace(' ', '-')}`}
                    >
                      <option value="Top">Top</option>
                      <option value="Mauvais">Mauvais</option>
                      <option value="À améliorer">À améliorer</option>
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="ghost-button tiny"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onDelete(entry.id)
                      }}
                      aria-label="Supprimer"
                      title="Supprimer"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default TimeTrackingTable

