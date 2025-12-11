import { useState } from 'react'
import { useTodoItems, useClients, useAgendaEvents } from '../../shared'
import TodoColumns from '../components/TodoColumns'
import AgendaCalendar from '../components/AgendaCalendar'
import ActionModal from '../components/ActionModal'
import AppointmentsManager from '../components/AppointmentsManager'
import { actionSchemas } from '../../data/dashboard'
import '../../App.css'

/**
 * Page Planning Freelance - To-do list interactive & Agenda & RDV
 */
export default function Planning() {
  const [activeTab, setActiveTab] = useState<'todo' | 'agenda' | 'rdv'>('todo')

  // Todo Hooks
  const { items: todoItems, addItem, updateItem, moveItem, deleteItem } = useTodoItems()

  // Agenda Hooks
  const { events, addEvent, updateEvent, deleteEvent } = useAgendaEvents()

  const { clients } = useClients()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalSchema, setModalSchema] = useState<any>(null)
  const [targetColumn, setTargetColumn] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [editingEvent, setEditingEvent] = useState<any>(null)
  const [copiedEvent, setCopiedEvent] = useState<any>(null)

  // --- MODAL HANDLERS ---

  const handleOpenModal = (columnId?: string) => {
    setEditingItem(null)
    setEditingEvent(null)

    // Schema depends on active tab
    const schemaKey = activeTab === 'todo' ? 'planning:todo' : 'planning:event'
    const schema = { ...actionSchemas[schemaKey] || actionSchemas['default'] }

    // Populate client options dynamically
    const clientField = schema.fields.find(f => f.id === 'client')
    if (clientField) {
      clientField.options = ['(Aucun)', ...clients.map(c => c.name)]
    }

    setModalSchema(schema)
    if (columnId) {
      setTargetColumn(columnId)
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setModalSchema(null)
    setTargetColumn(null)
    setEditingItem(null)
    setEditingEvent(null)
  }

  const handleModalSubmit = async (values: Record<string, string>) => {
    try {
      // Resolve client ID
      let clientId: string | undefined = undefined
      if (values.client && values.client !== '(Aucun)') {
        const client = clients.find(c => c.name === values.client)
        if (client) clientId = client.id
      }

      if (activeTab === 'todo') {
        // --- TODO LOGIC ---
        if (editingItem) {
          await updateItem(editingItem.id, {
            title: values.title,
            meta: values.notes,
            notes: values.image,
            client_id: clientId,
          })
          // Move if list changed
          const newColumnId = values.list === 'Rush' ? 'rush' : values.list === 'En cours' ? 'progress' : 'done'
          if (newColumnId !== editingItem.column_id) {
            const targetItems = todoItems.filter(i => i.column_id === newColumnId)
            await moveItem(editingItem.id, newColumnId, targetItems.length)
          }
        } else {
          const columnId = targetColumn || (values.list === 'Rush' ? 'rush' : values.list === 'En cours' ? 'progress' : 'done')
          const itemsInColumn = todoItems.filter(i => i.column_id === columnId)
          await addItem({
            column_id: columnId,
            title: values.title,
            meta: values.notes || '',
            tag: 'Nouveau',
            status_label: 'À faire',
            order_index: itemsInColumn.length,
            notes: values.image,
            client_id: clientId,
          })
        }
      } else {
        // --- AGENDA LOGIC ---
        // Helper to parse "HH:mm" to minutes
        const parseTime = (t: string) => {
          if (!t) return 0
          const [h, m] = t.split(':').map(Number)
          return h * 60 + m
        }

        const dayMap: Record<string, number> = { 'Lundi': 0, 'Mardi': 1, 'Mercredi': 2, 'Jeudi': 3, 'Vendredi': 4, 'Samedi': 5, 'Dimanche': 6 }
        const day = dayMap[values.day] ?? 0
        const startTime = parseTime(values.startTime)
        const endTime = parseTime(values.endTime)

        if (editingEvent) {
          await updateEvent(editingEvent.id, {
            label: values.title,
            day,
            start_time: startTime,
            end_time: endTime,
            type: values.type,
            client_id: clientId
          })
        } else {
          await addEvent({
            label: values.title,
            day,
            start_time: startTime,
            end_time: endTime,
            type: values.type || 'Client',
            color: '#5CE1FF',
            client_id: clientId
          })
        }
      }
    } catch (err) {
      console.error('Error saving item:', err)
    }
    handleCloseModal()
  }

  // --- TODO HANDLERS ---

  const getColumns = () => {
    const columns = [
      { id: 'rush', title: 'Rush', icon: 'runner', cards: [] as any[] },
      { id: 'progress', title: 'En cours', icon: 'folder', cards: [] as any[] },
      { id: 'done', title: 'Terminé', icon: 'shield', cards: [] as any[] },
    ]

    todoItems.forEach(item => {
      const column = columns.find(c => c.id === item.column_id)
      if (column) {
        column.cards.push({
          title: item.title,
          meta: item.meta || '',
          tag: item.tag || '',
          status: item.status_label || '',
          image: item.notes,
        })
      }
    })

    return columns
  }

  const handleEditTodo = (columnId: string, card: any) => {
    const item = todoItems.find(i => i.title === card.title && i.column_id === columnId)
    if (item) {
      setEditingItem(item)
      const schema = { ...actionSchemas['planning:todo'] }
      const clientField = schema.fields.find(f => f.id === 'client')
      if (clientField) {
        clientField.options = ['(Aucun)', ...clients.map(c => c.name)]
      }
      setModalSchema(schema)
      setIsModalOpen(true)
    }
  }

  const handleMoveCard = async (cardTitle: string, sourceColumnId: string, targetColumnId: string) => {
    const item = todoItems.find(i => i.title === cardTitle && i.column_id === sourceColumnId)
    if (item) {
      const targetItems = todoItems.filter(i => i.column_id === targetColumnId)
      await moveItem(item.id, targetColumnId, targetItems.length)
    }
  }

  const handleDeleteCard = async (columnId: string, cardTitle: string) => {
    if (confirm(`Supprimer la carte "${cardTitle}" ?`)) {
      const item = todoItems.find(i => i.title === cardTitle && i.column_id === columnId)
      if (item) await deleteItem(item.id)
    }
  }

  // --- AGENDA HANDLERS ---

  const handleAddEvent = async (event: any) => {
    await addEvent({
      label: event.label,
      day: event.day,
      start_time: event.startTime,
      end_time: event.endTime,
      type: event.type,
      color: event.color,
      source_card_id: event.sourceCardId
    })
  }

  const handleUpdateEvent = async (id: string, updates: any) => {
    // Map camelCase to snake_case for DB
    const dbUpdates: any = {}
    if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime
    if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime
    if (updates.day !== undefined) dbUpdates.day = updates.day
    if (updates.label !== undefined) dbUpdates.label = updates.label

    await updateEvent(id, dbUpdates)
  }

  const handleDeleteEvent = async (id: string) => {
    if (confirm('Supprimer cet événement ?')) {
      await deleteEvent(id)
    }
  }

  const handleEditEvent = (event: any) => {
    setEditingEvent(event)
    const schema = { ...actionSchemas['planning:event'] }
    // Populate fields...
    setModalSchema(schema)
    setIsModalOpen(true)
  }

  const handleCopyEvent = (event: any) => {
    setCopiedEvent(event)
  }

  const handlePasteEvent = async (day: number, startTime: number) => {
    if (!copiedEvent) return
    const duration = copiedEvent.endTime - copiedEvent.startTime
    await addEvent({
      label: copiedEvent.label,
      day,
      start_time: startTime,
      end_time: startTime + duration,
      type: copiedEvent.type,
      color: copiedEvent.color,
      client_id: copiedEvent.client_id
    })
  }

  const handleCellClick = (_day: number, _hour: number, _minutes: number) => {
    // Open modal pre-filled
    const schema = { ...actionSchemas['planning:event'] }
    setModalSchema(schema)
    setIsModalOpen(true)
    // Note: In a real implementation we would pre-fill the form with clicked time
  }

  // --- INITIAL VALUES ---

  const getInitialValues = (): Record<string, string> | undefined => {
    if (activeTab === 'todo') {
      if (targetColumn) {
        return {
          list: targetColumn === 'rush' ? 'Rush' : targetColumn === 'progress' ? 'En cours' : 'Terminé',
          client: '(Aucun)',
          title: '',
          notes: '',
          deadline: ''
        }
      }
      if (editingItem) {
        const clientName = clients.find(c => c.id === editingItem.client_id)?.name || '(Aucun)'
        return {
          list: editingItem.column_id === 'rush' ? 'Rush' : editingItem.column_id === 'progress' ? 'En cours' : 'Terminé',
          client: clientName,
          title: editingItem.title || '',
          notes: editingItem.meta || '',
          deadline: '',
          image: editingItem.notes || ''
        }
      }
    } else {
      if (editingEvent) {
        const formatTime = (m: number) => {
          const h = Math.floor(m / 60)
          const min = m % 60
          return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
        }
        const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
        return {
          title: editingEvent.label,
          day: days[editingEvent.day],
          startTime: formatTime(editingEvent.startTime),
          endTime: formatTime(editingEvent.endTime),
          type: editingEvent.type
        }
      }
    }
    return undefined
  }

  // Adapter les événements pour le calendrier
  const calendarEvents = events.map(e => ({
    id: e.id,
    label: e.label,
    day: e.day,
    startTime: e.start_time,
    endTime: e.end_time,
    type: e.type || 'Client',
    color: e.color,
    client_id: e.client_id
  }))

  return (
    <div className="workspace__content">
      <div className="section-header">
        <div className="section-header__tabs">
          <p className="section-header__label">Planning</p>
          <div className="tab-group">
            <button
              className={`tab-pill ${activeTab === 'todo' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('todo')}
            >
              To-do List
            </button>
            <button
              className={`tab-pill ${activeTab === 'agenda' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('agenda')}
            >
              Agenda
            </button>
            <button
              className={`tab-pill ${activeTab === 'rdv' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('rdv')}
            >
              Rendez-vous
            </button>
          </div>
        </div>
        {activeTab !== 'rdv' && (
          <div className="section-header__actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => handleOpenModal()}
              style={{
                background: 'linear-gradient(135deg, #6823ff, #3b4fff)',
              }}
            >
              {activeTab === 'todo' ? 'Ajouter une tâche' : 'Ajouter un événement'}
            </button>
          </div>
        )}
      </div>

      <ActionModal
        open={isModalOpen}
        schema={modalSchema}
        onClose={handleCloseModal}
        onSubmit={handleModalSubmit}
        initialValues={getInitialValues()}
      />

      {activeTab === 'todo' && (
        <TodoColumns
          columns={getColumns()}
          onEdit={handleEditTodo}
          onMoveCard={handleMoveCard}
          onDeleteCard={handleDeleteCard}
          onAddCard={(colId) => handleOpenModal(colId)}
        />
      )}

      {activeTab === 'agenda' && (
        <AgendaCalendar
          events={calendarEvents}
          onAddEvent={handleAddEvent}
          onUpdateEvent={handleUpdateEvent}
          onDeleteEvent={handleDeleteEvent}
          onEdit={handleEditEvent}
          onCopyEvent={handleCopyEvent}
          onPasteEvent={handlePasteEvent}
          onCellClick={handleCellClick}
          copiedEvent={copiedEvent}
        />
      )}

      {activeTab === 'rdv' && (
        <AppointmentsManager />
      )}
    </div>
  )
}

