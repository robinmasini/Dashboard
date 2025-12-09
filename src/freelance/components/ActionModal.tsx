import { useEffect, useState } from 'react'
import type { ActionSchema, ActionField } from '../../data/dashboard'

type ActionModalProps = {
  open: boolean
  schema: ActionSchema | null
  onClose: () => void
  onSubmit: (values: Record<string, string>) => void
  initialValues?: Record<string, string>
}

const getInitialValues = (fields: ActionField[], initialValues?: Record<string, string>) =>
  fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.id] = initialValues?.[field.id] || ''
    return acc
  }, {})

const ActionModal = ({ open, schema, onClose, onSubmit, initialValues }: ActionModalProps) => {
  const [values, setValues] = useState<Record<string, string>>({})

  useEffect(() => {
    if (schema) {
      const initial = getInitialValues(schema.fields, initialValues)
      // Pour les champs de couleur sans valeur initiale, utiliser la première option
      schema.fields.forEach((field) => {
        if (field.id === 'color' && !initial[field.id] && field.options?.[0]) {
          initial[field.id] = field.options[0]
        }
      })
      setValues(initial)
    }
  }, [schema, initialValues])

  if (!open || !schema) return null

  const handleChange = (fieldId: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }))
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    onSubmit(values)
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="modal__header">
          <div>
            <p className="modal__eyebrow">{schema.key}</p>
            <h3>{initialValues && Object.keys(initialValues).length > 0 ? `Modifier ${schema.title.toLowerCase()}` : schema.title}</h3>
            <p className="modal__description">{schema.description}</p>
          </div>
          <button type="button" className="ghost-button" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </header>
        <form className="modal__body" onSubmit={handleSubmit}>
          {schema.fields.map((field) => {
            if (field.type === 'textarea') {
              return (
                <label key={field.id} className="modal-field">
                  <span>{field.label}</span>
                  <textarea
                    value={values[field.id] ?? ''}
                    placeholder={field.placeholder}
                    onChange={(event) => handleChange(field.id, event.target.value)}
                  />
                </label>
              )
            }
            if (field.type === 'file') {
              return (
                <label key={field.id} className="modal-field">
                  <span>{field.label}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onloadend = () => {
                          handleChange(field.id, reader.result as string)
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                    style={{ padding: '8px 0' }}
                  />
                  {values[field.id] && (
                    <div style={{ marginTop: '8px', maxWidth: '100%', maxHeight: '150px', overflow: 'hidden', borderRadius: '8px', position: 'relative' }}>
                      <img src={values[field.id]} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => handleChange(field.id, '')}
                        style={{
                          position: 'absolute', top: '4px', right: '4px',
                          background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none',
                          width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        title="Supprimer l'image"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </label>
              )
            }
            if (field.type === 'select') {
              // Si c'est un champ de couleur, afficher un sélecteur visuel
              if (field.id === 'color' && field.options) {
                const currentColor = values[field.id] || field.options[0] || '#5CE1FF'
                return (
                  <label key={field.id} className="modal-field">
                    <span>{field.label}</span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {field.options.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleChange(field.id, option)}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            border: currentColor === option ? '3px solid #fff' : '2px solid rgba(255, 255, 255, 0.2)',
                            backgroundColor: option,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          aria-label={`Couleur ${option}`}
                          title={option}
                        />
                      ))}
                    </div>
                  </label>
                )
              }
              return (
                <label key={field.id} className="modal-field">
                  <span>{field.label}</span>
                  <select
                    value={values[field.id] ?? ''}
                    onChange={(event) => handleChange(field.id, event.target.value)}
                  >
                    <option value="">Choisir...</option>
                    {field.options?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              )
            }
            return (
              <label key={field.id} className="modal-field">
                <span>{field.label}</span>
                <input
                  type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                  value={values[field.id] ?? ''}
                  placeholder={field.placeholder}
                  onChange={(event) => handleChange(field.id, event.target.value)}
                />
              </label>
            )
          })}
          <footer className="modal__footer">
            <button type="button" className="ghost-button" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="primary-button">
              {initialValues && Object.keys(initialValues).length > 0 ? 'Enregistrer les modifications' : schema.submitLabel}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

export default ActionModal


