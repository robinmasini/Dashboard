import { useState, useRef } from 'react'
import { useCRM } from '../../../shared/hooks/useCRM'
import type { CRMTemplate } from '../../../shared/types/crm'
import '../../../App.css'

export default function CRMTemplates() {
  const { templates, addTemplate, updateTemplate, deleteTemplate } = useCRM()
  
  // États de l'éditeur
  const [selectedTemplate, setSelectedTemplate] = useState<CRMTemplate | null>(null)
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  
  // Suivi du dernier champ texte actif pour l'insertion de variables
  const [lastActiveField, setLastActiveField] = useState<'subject' | 'body'>('body')
  
  // Références vers les champs pour l'insertion de texte
  const subjectRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  // Sélectionner un template à éditer
  const handleSelect = (temp: CRMTemplate) => {
    setSelectedTemplate(temp)
    setName(temp.name)
    setSubject(temp.subject || '')
    setBody(temp.body)
  }

  // Ouvrir un formulaire vide pour un nouveau template
  const handleNew = () => {
    setSelectedTemplate(null)
    setName('Nouveau template')
    setSubject('')
    setBody('')
  }

  // Enregistrer ou mettre à jour le template
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !body) {
      alert('Veuillez remplir le nom et le corps du template.')
      return
    }

    try {
      if (selectedTemplate) {
        // Mise à jour
        const updated = await updateTemplate(selectedTemplate.id, {
          name,
          subject,
          body
        })
        if (updated) {
          setSelectedTemplate(updated)
          alert('Template mis à jour !')
        }
      } else {
        // Création
        const created = await addTemplate({
          name,
          subject,
          body
        })
        if (created) {
          setSelectedTemplate(created)
          alert('Template créé !')
        }
      }
    } catch (err: any) {
      alert(`Erreur: ${err.message}`)
    }
  }

  // Supprimer un template
  const handleDelete = async (id: string, tempName: string) => {
    if (confirm(`Supprimer le template "${tempName}" ?`)) {
      try {
        await deleteTemplate(id)
        if (selectedTemplate?.id === id) {
          handleNew()
        }
      } catch (err: any) {
        alert(`Erreur: ${err.message}`)
      }
    }
  }

  // Insérer une variable à la position du curseur
  const insertVariable = (variableTag: string) => {
    if (lastActiveField === 'subject') {
      const input = subjectRef.current
      if (!input) return

      const start = input.selectionStart ?? 0
      const end = input.selectionEnd ?? 0
      const text = input.value
      const newText = text.substring(0, start) + variableTag + text.substring(end)
      
      setSubject(newText)
      
      // Repositionner le curseur juste après le tag inséré
      setTimeout(() => {
        input.focus()
        input.setSelectionRange(start + variableTag.length, start + variableTag.length)
      }, 0)
    } else {
      const textarea = bodyRef.current
      if (!textarea) return

      const start = textarea.selectionStart ?? 0
      const end = textarea.selectionEnd ?? 0
      const text = textarea.value
      const newText = text.substring(0, start) + variableTag + text.substring(end)
      
      setBody(newText)

      // Repositionner le curseur juste après le tag inséré
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + variableTag.length, start + variableTag.length)
      }, 0)
    }
  }

  // Variables de contact disponibles
  const variables = [
    { label: 'Prénom', tag: '{{first_name}}' },
    { label: 'Nom', tag: '{{last_name}}' },
    { label: 'Entreprise', tag: '{{company_name}}' },
    { label: 'Email', tag: '{{email}}' },
    { label: 'Role', tag: '{{role}}' },
    { label: 'LinkedIn', tag: '{{linkedin}}' },
    { label: 'Statut', tag: '{{status}}' },
    { label: 'Dernier contact', tag: '{{last_contact}}' },
    { label: 'Prochaine relance', tag: '{{next_followup}}' },
    { label: 'Projet', tag: '{{project_name}}' }
  ]

  return (
    <div className="workspace__content">
      {/* Header */}
      <div className="section-header">
        <div className="section-header__tabs">
          <p className="section-header__label">Personal CRM</p>
          <h1 style={{ margin: '8px 0', fontSize: '2rem', fontWeight: 700 }}>Templates de Messages</h1>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Liste des Templates (Gauche) */}
        <div className="panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Templates</h3>
            <button
              onClick={handleNew}
              className="primary-button"
              style={{
                marginLeft: 'auto',
                background: 'linear-gradient(135deg, #12131a, #000)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '6px 14px',
                fontSize: '0.85rem',
                borderRadius: '8px'
              }}
            >
              + Nouveau
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {templates.map(temp => (
              <div
                key={temp.id}
                onClick={() => handleSelect(temp)}
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  background: selectedTemplate?.id === temp.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)',
                  border: selectedTemplate?.id === temp.id ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255,255,255,0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff', marginBottom: '4px' }}>
                  {temp.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {temp.subject ? temp.subject : 'NO SUBJECT'}
                </div>
                
                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(temp.id, temp.name)
                  }}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'transparent',
                    border: 'none',
                    color: '#ff6b6b',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    opacity: 0.7
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Éditeur de Template (Droite) */}
        <div className="panel" style={{ padding: '28px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>Editeur</h3>

          <div style={{ marginBottom: '20px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
              Variables disponibles (issues de contacts) :
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {variables.map(v => (
                <button
                  key={v.tag}
                  type="button"
                  onClick={() => insertVariable(v.tag)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#fff',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="modal-field">
              <span>Nom du template</span>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Premier contact LinkedIn"
              />
            </div>

            <div className="modal-field">
              <span>Sujet (pour les emails)</span>
              <input
                ref={subjectRef}
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                onFocus={() => setLastActiveField('subject')}
                placeholder="Ex: {{first_name}}, recherche d'un développeur freelance ?"
              />
            </div>

            <div className="modal-field">
              <span>Corps</span>
              <textarea
                ref={bodyRef}
                required
                value={body}
                onChange={e => setBody(e.target.value)}
                onFocus={() => setLastActiveField('body')}
                style={{ height: '300px', lineHeight: '1.5' }}
                placeholder="Hello {{first_name}},\n\nJ'ai vu que {{company_name}} recherche..."
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Variables de fusion recommandées : <code>{"{{first_name}}"}</code>, <code>{"{{company_name}}"}</code>.
              </span>
              <button
                type="submit"
                className="primary-button"
                style={{
                  background: 'linear-gradient(135deg, #12131a, #000)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '12px 32px',
                  borderRadius: '10px'
                }}
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  )
}
