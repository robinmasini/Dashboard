import { useState, useEffect } from 'react'
import '../../App.css'

interface TicketRequestModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (category: string, description: string) => void
}

/**
 * Modal pour demander un nouveau ticket
 * Permet au client de créer une demande de ticket qui sera visible dans le Dashboard Freelance
 */
export default function TicketRequestModal({ open, onClose, onSubmit }: TicketRequestModalProps) {
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  // Réinitialiser le formulaire quand le modal s'ouvre
  useEffect(() => {
    if (open) {
      setCategory('')
      setDescription('')
      setError('')
    }
  }, [open])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!category) {
      setError('Veuillez sélectionner une catégorie')
      return
    }
    if (!description.trim()) {
      setError('Veuillez décrire votre demande')
      return
    }

    // Soumettre le formulaire
    onSubmit(category, description.trim())
    
    // Réinitialiser et fermer
    setCategory('')
    setDescription('')
    onClose()
  }

  const categories = [
    { value: 'Commande', label: 'Commande' },
    { value: 'Devis', label: 'Devis' },
    { value: 'Facturation', label: 'Facturation' },
    { value: 'Planning', label: 'Planning' },
    { value: 'Autre', label: 'Autre' },
  ]

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="modal__header">
          <div>
            <p className="modal__eyebrow">Demande de ticket</p>
            <h3>Demander un ticket</h3>
            <p className="modal__description">
              Décrivez votre demande. Elle sera traitée et visible dans votre espace.
            </p>
          </div>
          <button type="button" className="ghost-button" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </header>
        <form className="modal__body" onSubmit={handleSubmit}>
          <label className="modal-field">
            <span>Catégorie *</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '14px',
                padding: '10px 12px',
                color: '#fff',
                fontSize: '0.95rem',
                fontFamily: 'inherit',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              <option value="">Sélectionnez une catégorie</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </label>

          <label className="modal-field">
            <span>Description de la demande *</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez votre demande de ticket ici…"
              rows={6}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '14px',
                padding: '10px 12px',
                color: '#fff',
                fontSize: '0.95rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                width: '100%',
              }}
            />
          </label>

          {error && (
            <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '-8px' }}>
              {error}
            </div>
          )}

          <div className="modal__footer">
            <button type="button" className="ghost-button" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="primary-button">
              Envoyer la demande
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

