import { useState, useEffect } from 'react'
import type { AgendaEvent } from '../../data/dashboard'

type AgendaCalendarProps = {
  events: AgendaEvent[]
  onAddEvent: (event: Omit<AgendaEvent, 'id'>) => void
  onUpdateEvent: (id: string, updates: Partial<AgendaEvent>) => void
  onDeleteEvent: (id: string) => void
  onEdit: (event: AgendaEvent) => void
  onCopyEvent: (event: AgendaEvent) => void
  onCellClick: (day: number, hour: number, minutes: number) => void
  onPasteEvent?: (day: number, startTime: number) => void
  copiedEvent?: AgendaEvent | null
}

const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const hours = Array.from({ length: 17 }, (_, i) => i + 8) // 8h à minuit (24h)
const pixelsPerMinute = 1 // 1px par minute (chaque cellule de 60px = 60 minutes)

const formatTime = (minutes: number) => {
  const h = Math.floor(minutes / 60) % 24 // Modulo 24 pour gérer minuit (24h = 0h)
  const m = minutes % 60
  return `${h.toString().padStart(2, '0')}h${m.toString().padStart(2, '0')}`
}

const AgendaCalendar = ({
  events,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onEdit,
  onCopyEvent,
  onCellClick,
  onPasteEvent,
  copiedEvent
}: AgendaCalendarProps) => {
  const [draggedEvent, setDraggedEvent] = useState<{ id: string; offsetY: number } | null>(null)
  const [resizingEvent, setResizingEvent] = useState<{ id: string; isStart: boolean; initialY: number; initialTime: number } | null>(null)

  const handleCellDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleCellClick = (e: React.MouseEvent, day: number, hour: number) => {
    // Ne pas déclencher si on clique sur un événement
    if ((e.target as HTMLElement).closest('.agenda-calendar__event')) {
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const cellHeight = 60 // 60px par créneau horaire
    const minutesInCell = Math.floor((y / cellHeight) * 60)
    const minutes = Math.max(0, Math.min(59, minutesInCell))
    const startTime = hour * 60 + minutes

    // Si un événement est copié et qu'on a une fonction de collage, coller (simple clic ou Ctrl+V/Cmd+V)
    if (copiedEvent && onPasteEvent) {
      e.preventDefault()
      onPasteEvent(day, startTime)
      return
    }

    // Sinon, ouvrir le modal pour créer un nouvel événement
    onCellClick(day, hour, minutes)
  }

  const handleCellDrop = (e: React.DragEvent, day: number, hour: number) => {
    e.preventDefault()
    const cardData = e.dataTransfer.getData('application/json')
    if (cardData) {
      try {
        const card = JSON.parse(cardData)
        const rect = e.currentTarget.getBoundingClientRect()
        const y = e.clientY - rect.top
        const cellHeight = 60 // 60px par créneau horaire
        const minutesInCell = Math.floor((y / cellHeight) * 60)
        const startMinutes = hour * 60 + Math.max(0, Math.min(59, minutesInCell))
        const endMinutes = startMinutes + 60 // Par défaut 1 heure

        onAddEvent({
          label: card.title || 'Nouvelle tâche',
          day,
          startTime: startMinutes,
          endTime: endMinutes,
          type: card.tag || 'Client',
          color: '#5CE1FF', // Couleur par défaut pour les cartes glissées
          sourceCardId: card.title,
        })
      } catch (error) {
        console.error('Error parsing card data:', error)
      }
    }
  }

  const handleEventDragStart = (e: React.DragEvent, event: AgendaEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setDraggedEvent({ id: event.id, offsetY: e.clientY - rect.top })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleEventDrag = (e: React.DragEvent, event: AgendaEvent) => {
    if (!draggedEvent) return
    e.preventDefault()

    const calendarElement = e.currentTarget.closest('.agenda-calendar')
    if (!calendarElement) return

    const calendarRect = calendarElement.getBoundingClientRect()
    const timeColumnWidth = 80
    const dayWidth = (calendarRect.width - timeColumnWidth) / 7

    // Trouver le jour cible
    const x = e.clientX - calendarRect.left - timeColumnWidth
    const dayIndex = Math.floor(x / dayWidth)

    if (dayIndex >= 0 && dayIndex < 7) {
      const dayElement = calendarElement.querySelector(`[data-day="${dayIndex}"]`)
      if (dayElement) {
        const cellsContainer = dayElement.querySelector('.agenda-calendar__day-cells')
        if (!cellsContainer) return

        const cellsRect = cellsContainer.getBoundingClientRect()
        const relativeY = e.clientY - cellsRect.top
        // Chaque cellule = 60px = 60 minutes, donc 1px = 1 minute
        const totalMinutes = 480 + Math.floor(relativeY) // 480 = 8h en minutes
        const minutes = Math.max(480, Math.min(1440, totalMinutes)) // 1440 = minuit (24h) en minutes
        const hour = Math.floor(minutes / 60)
        const minute = minutes % 60
        const newStartTime = hour * 60 + Math.floor(minute / 15) * 15 // Arrondir à 15 minutes
        const duration = event.endTime - event.startTime

        onUpdateEvent(event.id, {
          startTime: newStartTime,
          endTime: newStartTime + duration,
          day: dayIndex,
        })
      }
    }
  }

  const handleResizeStart = (e: React.MouseEvent, event: AgendaEvent, isStart: boolean) => {
    e.stopPropagation()
    setResizingEvent({
      id: event.id,
      isStart,
      initialY: e.clientY,
      initialTime: isStart ? event.startTime : event.endTime,
    })
  }

  const handleResize = (e: MouseEvent) => {
    if (!resizingEvent) return

    const calendarElement = document.querySelector('.agenda-calendar')
    if (!calendarElement) return

    const event = events.find((evt) => evt.id === resizingEvent.id)
    if (!event) return

    const dayElement = calendarElement.querySelector(`[data-day="${event.day}"]`)
    if (!dayElement) return

    const cellsContainer = dayElement.querySelector('.agenda-calendar__day-cells')
    if (!cellsContainer) return

    const cellsRect = cellsContainer.getBoundingClientRect()
    const relativeY = e.clientY - cellsRect.top
    // Chaque cellule = 60px = 60 minutes, donc 1px = 1 minute
    const totalMinutes = 480 + Math.floor(relativeY) // 480 = 8h en minutes
    const minutes = Math.max(480, Math.min(1440, totalMinutes)) // 1440 = minuit (24h) en minutes
    const hour = Math.floor(minutes / 60)
    const minute = minutes % 60
    const newTime = hour * 60 + Math.floor(minute / 15) * 15

    if (resizingEvent.isStart) {
      if (newTime < event.endTime) {
        onUpdateEvent(event.id, { startTime: newTime })
      }
    } else {
      if (newTime > event.startTime) {
        onUpdateEvent(event.id, { endTime: newTime })
      }
    }
  }

  const handleResizeEnd = () => {
    setResizingEvent(null)
  }

  useEffect(() => {
    if (resizingEvent) {
      const handleMouseMove = (e: MouseEvent) => {
        handleResize(e)
      }
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleResizeEnd)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleResizeEnd)
      }
    }
  }, [resizingEvent, events, onUpdateEvent])

  return (
    <section className="panel agenda-calendar">
      <header className="panel__header">
        <p>Agenda hebdomadaire</p>
        <span>
          {copiedEvent
            ? `📋 Événement copié : "${copiedEvent.label}". Cliquez sur une cellule avec Ctrl+V (ou Cmd+V) pour coller.`
            : 'Glissez vos tâches depuis la todo list ou copiez-coller des cartes'}
        </span>
      </header>
      <div className="agenda-calendar__grid">
        <div className="agenda-calendar__time-column">
          {hours.map((hour) => (
            <div key={hour} className="agenda-calendar__time-slot">
              {hour}h
            </div>
          ))}
        </div>
        <div className="agenda-calendar__days">
          {days.map((day, dayIndex) => (
            <div key={day} className="agenda-calendar__day" data-day={dayIndex}>
              <div className="agenda-calendar__day-header">{day}</div>
              <div className="agenda-calendar__day-cells">
                {hours.map((hour) => (
                  <div
                    key={`${day}-${hour}`}
                    className="agenda-calendar__cell"
                    onDragOver={handleCellDragOver}
                    onDrop={(e) => handleCellDrop(e, dayIndex, hour)}
                    onClick={(e) => handleCellClick(e, dayIndex, hour)}
                    style={{
                      cursor: copiedEvent ? 'copy' : 'pointer',
                      position: 'relative'
                    }}
                  />
                ))}
              </div>
              <div className="agenda-calendar__events-container">
                {events
                  .filter((event) => event.day === dayIndex)
                  .map((event) => {
                    // 480 = 8h00 en minutes, chaque minute = 1px
                    const top = (event.startTime - 480) * pixelsPerMinute
                    const height = (event.endTime - event.startTime) * pixelsPerMinute
                    const defaultColor = '#5CE1FF'
                    const eventColor = event.color || defaultColor
                    // Convertir hex en rgba pour l'opacité
                    const hexToRgba = (hex: string, alpha: number) => {
                      const r = parseInt(hex.slice(1, 3), 16)
                      const g = parseInt(hex.slice(3, 5), 16)
                      const b = parseInt(hex.slice(5, 7), 16)
                      return `rgba(${r}, ${g}, ${b}, ${alpha})`
                    }
                    return (
                      <div
                        key={event.id}
                        className="agenda-calendar__event"
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          background: hexToRgba(eventColor, 0.15),
                          borderColor: hexToRgba(eventColor, 0.3),
                        }}
                        draggable
                        onDragStart={(e) => handleEventDragStart(e, event)}
                        onDrag={(e) => handleEventDrag(e, event)}
                        onDragEnd={() => setDraggedEvent(null)}
                      >
                        <div
                          className="agenda-calendar__event-resize-handle agenda-calendar__event-resize-handle--top"
                          onMouseDown={(e) => handleResizeStart(e, event, true)}
                        />
                        <div className="agenda-calendar__event-content">
                          <p className="agenda-calendar__event-title">{event.label}</p>
                          <p className="agenda-calendar__event-time">
                            {formatTime(event.startTime)} - {formatTime(event.endTime)}
                          </p>
                          <div className="agenda-calendar__event-actions">
                            <button
                              type="button"
                              className="ghost-button tiny"
                              onClick={(e) => {
                                e.stopPropagation()
                                onCopyEvent(event)
                              }}
                              aria-label="Copier"
                              title="Copier (Ctrl+C)"
                            >
                              📋
                            </button>
                            <button
                              type="button"
                              className="ghost-button tiny"
                              onClick={(e) => {
                                e.stopPropagation()
                                onEdit(event)
                              }}
                              aria-label="Modifier"
                              title="Modifier"
                            >
                              ✎
                            </button>
                            <button
                              type="button"
                              className="ghost-button tiny"
                              onClick={(e) => {
                                e.stopPropagation()
                                onDeleteEvent(event.id)
                              }}
                              aria-label="Supprimer"
                              title="Supprimer"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                        <div
                          className="agenda-calendar__event-resize-handle agenda-calendar__event-resize-handle--bottom"
                          onMouseDown={(e) => handleResizeStart(e, event, false)}
                        />
                      </div>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default AgendaCalendar

