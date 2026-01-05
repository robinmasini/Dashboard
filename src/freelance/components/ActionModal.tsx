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
          {/* Debug: check console for all fields in schema */}
          {(() => { console.log('ActionModal schema:', schema.key, 'Fields:', schema.fields.map(f => `${f.id}(${f.type})`).join(', ')); return null; })()}
          {schema.fields.map((field) => {
            console.log('Rendering field:', field.id, 'type:', field.type)
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
              // Déterminer les types acceptés basé sur le champ
              const acceptTypes = field.id === 'pdf' ? 'application/pdf' :
                field.id === 'image' ? 'image/*' :
                  'image/*,application/pdf'
              const isPdfField = field.id === 'pdf' || field.id.includes('pdf')

              // Function to trigger file input click
              const triggerFileInput = () => {
                const input = document.getElementById(`file-input-${field.id}`) as HTMLInputElement
                if (input) input.click()
              }

              return (
                <div key={field.id} className="modal-field">
                  <span>{field.label}</span>
                  <div
                    style={{
                      border: '2px dashed rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      padding: '20px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: values[field.id] ? 'rgba(104, 35, 255, 0.1)' : 'transparent'
                    }}
                    onClick={(e) => {
                      // Only trigger if clicking directly on the drop zone, not on buttons inside
                      if ((e.target as HTMLElement).tagName !== 'BUTTON') {
                        triggerFileInput()
                      }
                    }}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#6823ff' }}
                    onDragLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)' }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                      const file = e.dataTransfer.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onloadend = () => {
                          handleChange(field.id, reader.result as string)
                          // Stocker le nom du fichier pour l'affichage
                          handleChange(field.id + '_name', file.name)
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                  >
                    <input
                      type="file"
                      accept={acceptTypes}
                      onChange={(event) => {
                        console.log('File selected:', event.target.files?.[0])
                        const file = event.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onloadend = () => {
                            console.log('File read complete:', file.name)
                            handleChange(field.id, reader.result as string)
                            handleChange(field.id + '_name', file.name)
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                      style={{ display: 'none' }}
                      id={`file-input-${field.id}`}
                    />
                    <div style={{ cursor: 'pointer', display: 'block' }}>
                      {!values[field.id] ? (
                        <>
                          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>
                            {isPdfField ? '📄' : '📎'}
                          </div>
                          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            Glissez un fichier ici ou <span style={{ color: '#6823ff' }}>parcourir</span>
                          </p>
                          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            {isPdfField ? 'PDF uniquement' : 'Images ou PDF'}
                          </p>
                        </>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
                          {/* Check for base64 PDF OR existing PDF URL */}
                          {(values[field.id]?.startsWith('data:application/pdf') ||
                            values[field.id]?.toLowerCase().endsWith('.pdf') ||
                            values[field.id]?.includes('application/pdf') ||
                            (isPdfField && values[field.id]?.startsWith('http'))) ? (
                            <>
                              <span style={{ fontSize: '2rem' }}>📄</span>
                              <div style={{ textAlign: 'left' }}>
                                <p style={{ margin: 0, fontWeight: 600 }}>
                                  {values[field.id + '_name'] ||
                                    (values[field.id]?.startsWith('http') ? 'PDF existant' : 'Document PDF')}
                                </p>
                                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                  {values[field.id]?.startsWith('data:') ? 'PDF prêt à uploader' :
                                    values[field.id]?.startsWith('http') ? (
                                      <a
                                        href={values[field.id]}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ color: '#6823ff' }}
                                      >
                                        Voir le PDF ↗
                                      </a>
                                    ) : 'PDF'}
                                </p>
                              </div>
                            </>
                          ) : values[field.id]?.startsWith('data:image') || values[field.id]?.startsWith('http') ? (
                            <img
                              src={values[field.id]}
                              alt="Preview"
                              style={{ maxHeight: '100px', borderRadius: '8px' }}
                              onError={(e) => {
                                // If image fails to load, show a fallback
                                (e.target as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          ) : (
                            <>
                              <span style={{ fontSize: '2rem' }}>📎</span>
                              <div style={{ textAlign: 'left' }}>
                                <p style={{ margin: 0, fontWeight: 600 }}>{values[field.id + '_name'] || 'Fichier'}</p>
                              </div>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleChange(field.id, '')
                              handleChange(field.id + '_name', '')
                            }}
                            style={{
                              background: 'rgba(255, 107, 107, 0.2)',
                              color: '#ff6b6b',
                              border: '1px solid rgba(255, 107, 107, 0.3)',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '0.8rem'
                            }}
                          >
                            Supprimer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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


