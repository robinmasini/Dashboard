import { useState } from 'react'
import { useAvailabilitySlots, useAppointments, useClients } from '../../shared/hooks/useSupabaseHooks'
import '../../App.css'

const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

export default function AppointmentsManager() {
    const { slots, addSlot, deleteSlot, toggleSlot, loading: slotsLoading } = useAvailabilitySlots()
    const { appointments, confirmAppointment, cancelAppointment, loading: appointmentsLoading } = useAppointments()
    const { clients } = useClients()

    const [isAddingSlot, setIsAddingSlot] = useState(false)
    const [newSlot, setNewSlot] = useState({
        day_of_week: 1,
        start_time: '09:00',
        end_time: '12:00',
        slot_duration: 30
    })


    // Get upcoming appointments (today or later, not cancelled)
    const upcomingAppointments = appointments.filter(a => {
        const appointmentDate = new Date(a.appointment_date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return appointmentDate >= today && a.status !== 'cancelled'
    })

    // Get client name by ID
    const getClientName = (clientId: string) => {
        const client = clients.find(c => c.id === clientId)
        return client?.name || 'Client inconnu'
    }

    const handleAddSlot = async () => {
        try {
            await addSlot({
                ...newSlot,
                is_active: true
            })
            setIsAddingSlot(false)
            setNewSlot({ day_of_week: 1, start_time: '09:00', end_time: '12:00', slot_duration: 30 })
        } catch (error) {
            console.error('Error adding slot:', error)
        }
    }

    if (slotsLoading || appointmentsLoading) {
        return <p style={{ color: 'var(--text-muted)' }}>Chargement...</p>
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Section: RDV à venir */}
            <div className="panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                        📅 Rendez-vous à venir ({upcomingAppointments.length})
                    </h3>
                </div>

                {upcomingAppointments.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Aucun rendez-vous programmé
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {upcomingAppointments.map(apt => (
                            <div key={apt.id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '16px 20px',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '12px',
                                border: apt.status === 'pending'
                                    ? '1px solid rgba(251, 191, 36, 0.3)'
                                    : '1px solid rgba(74, 222, 128, 0.3)'
                            }}>
                                <div>
                                    <p style={{ fontWeight: 600, marginBottom: '4px' }}>
                                        {getClientName(apt.client_id)}
                                    </p>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        {new Date(apt.appointment_date).toLocaleDateString('fr-FR', {
                                            weekday: 'long',
                                            day: 'numeric',
                                            month: 'long'
                                        })} • {apt.start_time} - {apt.end_time}
                                    </p>
                                    {apt.notes && (
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', marginTop: '4px' }}>
                                            "{apt.notes}"
                                        </p>
                                    )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        background: apt.status === 'confirmed'
                                            ? 'rgba(74, 222, 128, 0.2)'
                                            : 'rgba(251, 191, 36, 0.2)',
                                        color: apt.status === 'confirmed' ? '#4ade80' : '#fbbf24'
                                    }}>
                                        {apt.status === 'confirmed' ? 'Confirmé' : 'En attente'}
                                    </span>

                                    {apt.status === 'pending' && (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => confirmAppointment(apt.id)}
                                                style={{
                                                    padding: '8px 16px',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    background: 'rgba(74, 222, 128, 0.2)',
                                                    color: '#4ade80',
                                                    cursor: 'pointer',
                                                    fontWeight: 600,
                                                    fontSize: '0.85rem'
                                                }}
                                            >
                                                ✓ Confirmer
                                            </button>
                                            <button
                                                onClick={() => cancelAppointment(apt.id)}
                                                style={{
                                                    padding: '8px 16px',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    background: 'rgba(239, 68, 68, 0.15)',
                                                    color: '#ef4444',
                                                    cursor: 'pointer',
                                                    fontWeight: 600,
                                                    fontSize: '0.85rem'
                                                }}
                                            >
                                                ✕ Refuser
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Section: Gestion des disponibilités */}
            <div className="panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                        ⏰ Mes disponibilités
                    </h3>
                    <button
                        onClick={() => setIsAddingSlot(true)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #4f9dff, #6366f1)',
                            color: 'white',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.9rem'
                        }}
                    >
                        + Ajouter un créneau
                    </button>
                </div>

                {/* Add new slot form */}
                {isAddingSlot && (
                    <div style={{
                        padding: '16px 20px',
                        background: 'rgba(79, 157, 255, 0.1)',
                        borderRadius: '12px',
                        marginBottom: '16px',
                        border: '1px solid rgba(79, 157, 255, 0.2)'
                    }}>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    Jour
                                </label>
                                <select
                                    value={newSlot.day_of_week}
                                    onChange={(e) => setNewSlot({ ...newSlot, day_of_week: parseInt(e.target.value) })}
                                    style={{
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.03)',
                                        color: 'white',
                                        fontSize: '0.95rem'
                                    }}
                                >
                                    {DAYS_FR.map((day, i) => (
                                        <option key={i} value={i} style={{ background: '#1a1a2e' }}>{day}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    Début
                                </label>
                                <input
                                    type="time"
                                    value={newSlot.start_time}
                                    onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                                    style={{
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.03)',
                                        color: 'white',
                                        fontSize: '0.95rem'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    Fin
                                </label>
                                <input
                                    type="time"
                                    value={newSlot.end_time}
                                    onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                                    style={{
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.03)',
                                        color: 'white',
                                        fontSize: '0.95rem'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    Durée RDV
                                </label>
                                <select
                                    value={newSlot.slot_duration}
                                    onChange={(e) => setNewSlot({ ...newSlot, slot_duration: parseInt(e.target.value) })}
                                    style={{
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.03)',
                                        color: 'white',
                                        fontSize: '0.95rem'
                                    }}
                                >
                                    <option value={15} style={{ background: '#1a1a2e' }}>15 min</option>
                                    <option value={30} style={{ background: '#1a1a2e' }}>30 min</option>
                                    <option value={45} style={{ background: '#1a1a2e' }}>45 min</option>
                                    <option value={60} style={{ background: '#1a1a2e' }}>1 heure</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={handleAddSlot}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: '#4ade80',
                                        color: '#000',
                                        cursor: 'pointer',
                                        fontWeight: 600
                                    }}
                                >
                                    Ajouter
                                </button>
                                <button
                                    onClick={() => setIsAddingSlot(false)}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'transparent',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Annuler
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Slots grouped by day */}
                {slots.length === 0 && !isAddingSlot ? (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Aucune disponibilité définie. Ajoutez des créneaux pour que les clients puissent prendre rendez-vous.
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {DAYS_FR.map((day, dayIndex) => {
                            const daySlots = slots.filter(s => s.day_of_week === dayIndex)
                            if (daySlots.length === 0) return null

                            return (
                                <div key={dayIndex} style={{
                                    padding: '12px 16px',
                                    background: 'rgba(255,255,255,0.02)',
                                    borderRadius: '10px'
                                }}>
                                    <p style={{ fontWeight: 600, marginBottom: '10px', color: '#4f9dff' }}>{day}</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                        {daySlots.map(slot => (
                                            <div key={slot.id} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                padding: '8px 14px',
                                                borderRadius: '8px',
                                                background: slot.is_active ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255,255,255,0.03)',
                                                border: `1px solid ${slot.is_active ? 'rgba(74, 222, 128, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                                                opacity: slot.is_active ? 1 : 0.5
                                            }}>
                                                <span style={{ fontWeight: 500 }}>
                                                    {slot.start_time} - {slot.end_time}
                                                </span>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    ({slot.slot_duration}min)
                                                </span>
                                                <button
                                                    onClick={() => toggleSlot(slot.id, !slot.is_active)}
                                                    style={{
                                                        padding: '4px 10px',
                                                        borderRadius: '6px',
                                                        border: 'none',
                                                        background: slot.is_active ? 'rgba(251, 191, 36, 0.2)' : 'rgba(74, 222, 128, 0.2)',
                                                        color: slot.is_active ? '#fbbf24' : '#4ade80',
                                                        cursor: 'pointer',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    {slot.is_active ? 'Désactiver' : 'Activer'}
                                                </button>
                                                <button
                                                    onClick={() => deleteSlot(slot.id)}
                                                    style={{
                                                        padding: '4px 8px',
                                                        borderRadius: '6px',
                                                        border: 'none',
                                                        background: 'rgba(239, 68, 68, 0.15)',
                                                        color: '#ef4444',
                                                        cursor: 'pointer',
                                                        fontSize: '0.75rem'
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
