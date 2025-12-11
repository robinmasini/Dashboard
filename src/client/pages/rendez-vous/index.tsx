import { useState, useMemo } from 'react'
import { useAvailabilitySlots, useAppointments } from '../../../shared/hooks/useSupabaseHooks'
import { getClientInfo } from '../../../shared/utils/auth'
import robinAvatar from '../../../assets/robin-avatar.png'
import '../../../App.css'

const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

// Helper to generate time slots from a range
function generateTimeSlots(startTime: string, endTime: string, duration: number): string[] {
    const slots: string[] = []
    const [startH, startM] = startTime.split(':').map(Number)
    const [endH, endM] = endTime.split(':').map(Number)

    let currentMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    while (currentMinutes + duration <= endMinutes) {
        const h = Math.floor(currentMinutes / 60)
        const m = currentMinutes % 60
        slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
        currentMinutes += duration
    }

    return slots
}

export default function ClientRendezVous() {
    const clientInfo = getClientInfo()
    const { slots: availabilitySlots, loading: slotsLoading } = useAvailabilitySlots()
    const {
        appointments,
        addAppointment,
        cancelAppointment,
        loading: appointmentsLoading,
        getBookedSlotsForDate
    } = useAppointments(clientInfo?.id)

    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
    const [notes, setNotes] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')
    const [showConfirmationModal, setShowConfirmationModal] = useState(false)
    const [lastBookedAppointment, setLastBookedAppointment] = useState<{ date: string, time: string } | null>(null)
    const [rescheduleMode, setRescheduleMode] = useState<string | null>(null) // appointment ID being rescheduled

    // Generate next 14 days for date picker
    const availableDates = useMemo(() => {
        const dates: Date[] = []
        const today = new Date()
        for (let i = 1; i <= 14; i++) {
            const date = new Date(today)
            date.setDate(today.getDate() + i)
            dates.push(date)
        }
        return dates
    }, [])

    // Get available time slots for selected date
    const availableTimeSlots = useMemo(() => {
        if (!selectedDate) return []

        const dayOfWeek = selectedDate.getDay()
        const dateStr = selectedDate.toISOString().split('T')[0]
        const bookedSlots = getBookedSlotsForDate(dateStr)

        // Get availability for this day
        const daySlots = availabilitySlots.filter(s => s.day_of_week === dayOfWeek && s.is_active)

        // Generate all time slots
        const allSlots: { time: string; available: boolean }[] = []

        daySlots.forEach(slot => {
            const times = generateTimeSlots(slot.start_time, slot.end_time, slot.slot_duration)
            times.forEach(time => {
                // Check if not already booked
                const isBooked = bookedSlots.some(b => b.start === time)
                allSlots.push({ time, available: !isBooked })
            })
        })

        return allSlots
    }, [selectedDate, availabilitySlots, getBookedSlotsForDate])

    const handleBookAppointment = async () => {
        if (!selectedDate || !selectedSlot || !clientInfo?.id) return

        setIsSubmitting(true)
        try {
            const dateStr = selectedDate.toISOString().split('T')[0]
            const slotDuration = availabilitySlots.find(s => s.day_of_week === selectedDate.getDay())?.slot_duration || 30

            const [h, m] = selectedSlot.split(':').map(Number)
            const endMinutes = h * 60 + m + slotDuration
            const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`

            await addAppointment({
                client_id: clientInfo.id,
                appointment_date: dateStr,
                start_time: selectedSlot,
                end_time: endTime,
                status: 'confirmed',
                notes: notes || undefined
            })

            // If rescheduling, cancel the old appointment
            if (rescheduleMode) {
                await cancelAppointment(rescheduleMode)
                setRescheduleMode(null)
            }

            // Show confirmation modal
            setLastBookedAppointment({
                date: selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
                time: selectedSlot
            })
            setShowConfirmationModal(true)
            setSelectedDate(null)
            setSelectedSlot(null)
            setNotes('')
        } catch (error) {
            console.error('Error booking appointment:', error)
            alert('Erreur lors de la réservation')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCancelAppointment = async (appointmentId: string) => {
        if (confirm('Êtes-vous sûr de vouloir annuler ce rendez-vous ?')) {
            try {
                await cancelAppointment(appointmentId)
                setSuccessMessage('Rendez-vous annulé avec succès')
                setTimeout(() => setSuccessMessage(''), 3000)
            } catch (error) {
                console.error('Error cancelling:', error)
                alert('Erreur lors de l\'annulation')
            }
        }
    }

    const handleReschedule = (appointmentId: string) => {
        setRescheduleMode(appointmentId)
        setSuccessMessage('Choisissez une nouvelle date et un nouveau créneau')
        setTimeout(() => setSuccessMessage(''), 5000)
    }

    // Filter upcoming appointments
    const upcomingAppointments = appointments.filter(a => {
        const appointmentDate = new Date(a.appointment_date)
        return appointmentDate >= new Date() && a.status !== 'cancelled'
    })

    if (slotsLoading || appointmentsLoading) {
        return (
            <div className="workspace__content">
                <p style={{ color: 'var(--text-muted)' }}>Chargement...</p>
            </div>
        )
    }

    return (
        <div className="workspace__content">
            {/* Freelancer Profile Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '32px',
                padding: '24px',
                background: 'linear-gradient(135deg, rgba(79, 157, 255, 0.1), rgba(99, 102, 241, 0.1))',
                borderRadius: '16px',
                border: '1px solid rgba(79, 157, 255, 0.2)'
            }}>
                <img
                    src={robinAvatar}
                    alt="Robin MASINI"
                    style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '3px solid rgba(79, 157, 255, 0.5)'
                    }}
                />
                <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '4px' }}>
                        Prendre rendez-vous avec
                    </p>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700 }}>
                        Robin MASINI
                    </h1>
                </div>
            </div>

            {successMessage && (
                <div style={{
                    background: 'rgba(74, 222, 128, 0.1)',
                    border: '1px solid rgba(74, 222, 128, 0.3)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    marginBottom: '24px',
                    color: '#4ade80'
                }}>
                    ✓ {successMessage}
                </div>
            )}

            {/* Existing Appointments */}
            {upcomingAppointments.length > 0 && (
                <div className="panel" style={{ marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', fontWeight: 600 }}>
                        📅 Vos rendez-vous à venir
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {upcomingAppointments.map(apt => (
                            <div key={apt.id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '16px 20px',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '12px',
                                border: apt.status === 'confirmed'
                                    ? '1px solid rgba(74, 222, 128, 0.2)'
                                    : '1px solid rgba(255,255,255,0.05)'
                            }}>
                                <div>
                                    <p style={{ fontWeight: 600, marginBottom: '4px' }}>
                                        {new Date(apt.appointment_date).toLocaleDateString('fr-FR', {
                                            weekday: 'long',
                                            day: 'numeric',
                                            month: 'long'
                                        })}
                                    </p>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        {apt.start_time} - {apt.end_time}
                                    </p>
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
                                        {apt.status === 'confirmed' ? '✓ Confirmé' : 'En attente'}
                                    </span>
                                    <button
                                        onClick={() => handleReschedule(apt.id)}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            border: '1px solid rgba(79, 157, 255, 0.3)',
                                            background: 'rgba(79, 157, 255, 0.1)',
                                            color: '#4f9dff',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            fontWeight: 600
                                        }}
                                    >
                                        Reporter
                                    </button>
                                    <button
                                        onClick={() => handleCancelAppointment(apt.id)}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            color: '#ef4444',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            fontWeight: 600
                                        }}
                                    >
                                        Annuler
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirmationModal && lastBookedAppointment && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                        borderRadius: '20px',
                        padding: '40px',
                        maxWidth: '400px',
                        textAlign: 'center',
                        border: '1px solid rgba(74, 222, 128, 0.3)',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            background: 'rgba(74, 222, 128, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px',
                            fontSize: '40px'
                        }}>
                            ✓
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px', color: '#4ade80' }}>
                            Rendez-vous confirmé !
                        </h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>
                            {lastBookedAppointment.date}
                        </p>
                        <p style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '32px' }}>
                            à {lastBookedAppointment.time}
                        </p>
                        <button
                            onClick={() => setShowConfirmationModal(false)}
                            style={{
                                width: '100%',
                                padding: '14px 24px',
                                borderRadius: '12px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #4ade80, #22c55e)',
                                color: '#000',
                                fontWeight: 700,
                                fontSize: '1rem',
                                cursor: 'pointer'
                            }}
                        >
                            Parfait !
                        </button>
                    </div>
                </div>
            )}

            {/* Date Selection */}
            <div className="panel" style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', fontWeight: 600 }}>
                    1. Choisir une date
                </h3>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: '12px'
                }}>
                    {availableDates.map(date => {
                        const dayOfWeek = date.getDay()
                        const hasSlots = availabilitySlots.some(s => s.day_of_week === dayOfWeek && s.is_active)
                        const isSelected = selectedDate?.toDateString() === date.toDateString()

                        return (
                            <button
                                key={date.toISOString()}
                                onClick={() => {
                                    setSelectedDate(date)
                                    setSelectedSlot(null)
                                }}
                                disabled={!hasSlots}
                                style={{
                                    padding: '16px 12px',
                                    borderRadius: '12px',
                                    border: isSelected
                                        ? '2px solid #4f9dff'
                                        : '1px solid rgba(255,255,255,0.1)',
                                    background: isSelected
                                        ? 'rgba(79, 157, 255, 0.1)'
                                        : hasSlots
                                            ? 'rgba(255,255,255,0.03)'
                                            : 'rgba(255,255,255,0.01)',
                                    color: hasSlots ? 'white' : 'rgba(255,255,255,0.3)',
                                    cursor: hasSlots ? 'pointer' : 'not-allowed',
                                    textAlign: 'center'
                                }}
                            >
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                    {DAYS_FR[dayOfWeek]}
                                </p>
                                <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                                    {date.getDate()}
                                </p>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {date.toLocaleDateString('fr-FR', { month: 'short' })}
                                </p>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Time Slot Selection */}
            {selectedDate && (
                <div className="panel" style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', fontWeight: 600 }}>
                        2. Choisir un créneau - {DAYS_FR[selectedDate.getDay()]} {selectedDate.getDate()} {selectedDate.toLocaleDateString('fr-FR', { month: 'long' })}
                    </h3>

                    {availableTimeSlots.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Aucun créneau disponible ce jour
                        </p>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                            gap: '10px'
                        }}>
                            {availableTimeSlots.map(slot => (
                                <button
                                    key={slot.time}
                                    onClick={() => slot.available && setSelectedSlot(slot.time)}
                                    disabled={!slot.available}
                                    style={{
                                        padding: '12px 16px',
                                        borderRadius: '8px',
                                        border: selectedSlot === slot.time
                                            ? '2px solid #4ade80'
                                            : '1px solid rgba(255,255,255,0.1)',
                                        background: selectedSlot === slot.time
                                            ? 'rgba(74, 222, 128, 0.1)'
                                            : slot.available
                                                ? 'rgba(255,255,255,0.03)'
                                                : 'rgba(255,255,255,0.01)',
                                        color: slot.available ? 'white' : 'rgba(255,255,255,0.3)',
                                        cursor: slot.available ? 'pointer' : 'not-allowed',
                                        fontWeight: 600,
                                        textDecoration: !slot.available ? 'line-through' : 'none'
                                    }}
                                >
                                    {slot.time}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Confirmation */}
            {selectedSlot && (
                <div className="panel">
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', fontWeight: 600 }}>
                        3. Confirmer le rendez-vous
                    </h3>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>
                            Notes (optionnel)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ajouter une note pour le rendez-vous..."
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.03)',
                                color: 'white',
                                resize: 'vertical',
                                minHeight: '80px'
                            }}
                        />
                    </div>

                    <button
                        onClick={handleBookAppointment}
                        disabled={isSubmitting}
                        style={{
                            width: '100%',
                            padding: '16px 24px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #4f9dff, #6366f1)',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '1rem',
                            cursor: isSubmitting ? 'wait' : 'pointer',
                            opacity: isSubmitting ? 0.7 : 1
                        }}
                    >
                        {isSubmitting ? 'Réservation en cours...' : 'Demander ce rendez-vous'}
                    </button>

                    <p style={{
                        marginTop: '12px',
                        fontSize: '0.85rem',
                        color: 'var(--text-muted)',
                        textAlign: 'center'
                    }}>
                        Le rendez-vous sera en attente de confirmation
                    </p>
                </div>
            )}
        </div>
    )
}
