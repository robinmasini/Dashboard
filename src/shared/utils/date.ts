import { useState, useEffect } from 'react'

/**
 * Formater la date du jour en français
 */
export function getTodayDateFormatted(): string {
    const today = new Date()
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
    const months = [
        'Janvier',
        'Février',
        'Mars',
        'Avril',
        'Mai',
        'Juin',
        'Juillet',
        'Août',
        'Septembre',
        'Octobre',
        'Novembre',
        'Décembre',
    ]

    const dayName = days[today.getDay()]
    const day = today.getDate()
    const month = months[today.getMonth()]
    const year = today.getFullYear()

    return `${dayName} ${day} ${month} ${year}`
}

/**
 * Hook pour obtenir la date du jour formatée et la mettre à jour automatiquement
 */
export function useTodayDate(): string {
    const [date, setDate] = useState<string>(getTodayDateFormatted())

    useEffect(() => {
        const updateDate = () => {
            setDate(getTodayDateFormatted())
        }

        // Mettre à jour immédiatement
        updateDate()

        // Calculer le temps jusqu'à minuit
        const now = new Date()
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)
        const msUntilMidnight = tomorrow.getTime() - now.getTime()

        // Programmer la mise à jour à minuit
        const timeoutId = setTimeout(() => {
            updateDate()
            // Ensuite, mettre à jour toutes les 24 heures
            const intervalId = setInterval(updateDate, 24 * 60 * 60 * 1000)
            return () => clearInterval(intervalId)
        }, msUntilMidnight)

        return () => clearTimeout(timeoutId)
    }, [])

    return date
}
