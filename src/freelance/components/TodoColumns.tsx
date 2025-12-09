import { useState } from 'react'
import type { TodoColumn } from '../../data/dashboard'

type TodoColumnsProps = {
  columns: TodoColumn[]
  onEdit: (columnId: string, card: { title: string; meta: string; tag: string; status: string; image?: string }) => void
  onMoveCard: (cardTitle: string, sourceColumnId: string, targetColumnId: string) => void
  onDeleteCard: (columnId: string, cardTitle: string) => void
  onAddCard: (columnId: string) => void
}

const iconMap: Record<string, string> = {
  runner: '🏃‍♂️',
  folder: '📁',
  shield: '✅',
}

const TodoColumns = ({ columns, onEdit, onMoveCard, onDeleteCard, onAddCard }: TodoColumnsProps) => {
  const [draggedCard, setDraggedCard] = useState<{ title: string; columnId: string } | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, cardTitle: string, columnId: string) => {
    setDraggedCard({ title: cardTitle, columnId })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(columnId)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault()
    if (draggedCard && draggedCard.columnId !== targetColumnId) {
      onMoveCard(draggedCard.title, draggedCard.columnId, targetColumnId)
    }
    setDraggedCard(null)
    setDragOverColumn(null)
  }

  return (
    <section className="todo-grid">
      {columns.map((column) => (
        <article
          key={column.id}
          className={`panel todo-column ${dragOverColumn === column.id ? 'todo-column--drag-over' : ''}`}
          onDragOver={(e) => handleDragOver(e, column.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, column.id)}
        >
          <header className="todo-column__header">
            <span className="todo-column__icon">{iconMap[column.icon] ?? '🗂️'}</span>
            <div>
              <p className="todo-column__title">{column.title}</p>
              <p className="todo-column__count">{column.cards.length} cartes</p>
            </div>
            <button
              type="button"
              className="ghost-button tiny"
              onClick={() => onAddCard(column.id)}
              aria-label="Ajouter une tâche"
              title="Ajouter une tâche"
            >
              +
            </button>
          </header>
          <div className="todo-column__cards">
            {column.cards.map((card) => (
              <div
                key={card.title}
                className="todo-card"
                draggable
                onDragStart={(e) => {
                  handleDragStart(e, card.title, column.id)
                  e.dataTransfer.setData('application/json', JSON.stringify({ title: card.title, tag: card.tag, meta: card.meta }))
                }}
                style={{ cursor: 'grab' }}
              >
                {card.image && (
                  <div style={{ marginBottom: '12px', borderRadius: '8px', overflow: 'hidden', width: '100%', height: '120px' }}>
                    <img src={card.image} alt={card.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                  <p className="todo-card__title">{card.title}</p>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      className="ghost-button tiny"
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        onEdit(column.id, card)
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
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
                        e.preventDefault()
                        onDeleteCard(column.id, card.title)
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      aria-label="Supprimer"
                      title="Supprimer"
                      style={{ color: '#ff6b6b' }}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <p className="todo-card__meta">{card.meta}</p>
                <div className="todo-card__footer">
                  <span className="todo-card__tag">{card.tag}</span>
                  <span className="todo-card__status">{card.status}</span>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="text-button" onClick={() => onAddCard(column.id)}>
            + Ajouter une tâche
          </button>
        </article>
      ))}
    </section>
  )
}

export default TodoColumns


