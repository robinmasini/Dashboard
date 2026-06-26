import { useState } from 'react'
import { useCRM } from '../../../shared/hooks/useCRM'
import type { CRMContact, CRMCompany } from '../../../shared/types/crm'
import '../../../App.css'

export default function CRMContacts() {
  const {
    contacts,
    companies,
    templates,
    updateContact,
    deleteContact,
    addContact,
    exportToJSON,
    importFromJSON
  } = useCRM()

  // États pour les filtres
  const [filterProject, setFilterProject] = useState('Tous')
  const [filterStatus, setFilterStatus] = useState('Tous')
  const [filterDomain, setFilterDomain] = useState('Tous')
  const [searchQuery, setSearchQuery] = useState('')

  // États pour l'Import/Export JSON
  const [isJsonPanelOpen, setIsJsonPanelOpen] = useState(false)
  const [jsonText, setJsonText] = useState('')

  // États pour le Rédacteur de Message (Drawer)
  const [activeContact, setActiveContact] = useState<CRMContact | null>(null)
  const [activeCompany, setActiveCompany] = useState<CRMCompany | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [generatedSubject, setGeneratedSubject] = useState('')
  const [generatedBody, setGeneratedBody] = useState('')

  // États pour l'ajout d'un contact manuel
  const [isAddContactOpen, setIsAddContactOpen] = useState(false)
  const [newFirstName, setNewFirstName] = useState('')
  const [newLastName, setNewLastName] = useState('')
  const [newRole, setNewRole] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newLinkedin, setNewLinkedin] = useState('')
  const [newCompanyId, setNewCompanyId] = useState('')
  const [newChannel, setNewChannel] = useState<'email' | 'whatsapp' | 'linkedin' | 'welcometothejungle' | 'indeed'>('linkedin')
  const [newNotes, setNewNotes] = useState('')

  // Gérer le changement de statut
  const handleStatusChange = async (contactId: string, status: any) => {
    try {
      await updateContact(contactId, { 
        status,
        last_contact_date: new Date().toISOString().split('T')[0]
      })
    } catch (e) {
      console.error(e)
    }
  }

  // Gérer l'export JSON
  const handleExport = () => {
    const dataStr = exportToJSON()
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    const exportFileDefaultName = `personal_crm_backup_${new Date().toISOString().split('T')[0]}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  // Gérer l'import JSON
  const handleImportSubmit = async () => {
    if (!jsonText.trim()) return
    try {
      await importFromJSON(jsonText)
      alert('Données importées avec succès !')
      setIsJsonPanelOpen(false)
      setJsonText('')
    } catch (err: any) {
      alert(`Erreur d'importation : ${err.message}`)
    }
  }

  // Ouvrir le rédacteur pour un contact
  const handleOpenWriter = (contact: CRMContact) => {
    const company = companies.find(c => c.id === contact.company_id) || null
    setActiveContact(contact)
    setActiveCompany(company)
    
    // Sélectionner le premier template par défaut s'il y en a
    if (templates.length > 0) {
      handleSelectTemplate(templates[0].id, contact, company)
    } else {
      setSelectedTemplateId('')
      setGeneratedSubject('')
      setGeneratedBody('')
    }
  }

  // Remplacer les variables du template
  const handleSelectTemplate = (templateId: string, contact: CRMContact, company: CRMCompany | null) => {
    setSelectedTemplateId(templateId)
    const template = templates.find(t => t.id === templateId)
    if (!template) return

    const replaceVars = (text: string) => {
      if (!text) return ''
      return text
        .replace(/\{\{first_name\}\}/g, contact.first_name || '')
        .replace(/\{\{last_name\}\}/g, contact.last_name || '')
        .replace(/\{\{company_name\}\}/g, company?.name || 'votre entreprise')
        .replace(/\{\{role\}\}/g, contact.role || 'Développeur/Designer')
        .replace(/\{\{project_name\}\}/g, company?.project_name || 'Lexona')
        .replace(/\{\{email\}\}/g, contact.email || '')
        .replace(/\{\{linkedin\}\}/g, contact.linkedin_url || '')
        .replace(/\{\{status\}\}/g, contact.status || '')
    }

    setGeneratedSubject(replaceVars(template.subject || ''))
    setGeneratedBody(replaceVars(template.body))
  }

  // Copier le message généré dans le presse-papier
  const handleCopyMessage = () => {
    let fullText = ''
    if (generatedSubject) {
      fullText += `Sujet : ${generatedSubject}\n\n`
    }
    fullText += generatedBody
    navigator.clipboard.writeText(fullText)
    alert('Message copié dans le presse-papier !')
  }

  // Ouvrir le canal de communication approprié
  const handleSend = () => {
    if (!activeContact) return
    const encodedBody = encodeURIComponent(generatedBody)
    const encodedSubject = encodeURIComponent(generatedSubject)

    if (activeContact.channel === 'whatsapp' && activeContact.phone) {
      // WhatsApp
      const cleanPhone = activeContact.phone.replace(/[^0-9+]/g, '')
      window.open(`https://wa.me/${cleanPhone}?text=${encodedBody}`, '_blank')
    } else if (activeContact.channel === 'email' && activeContact.email) {
      // Mailto
      window.open(`mailto:${activeContact.email}?subject=${encodedSubject}&body=${encodedBody}`, '_blank')
    } else if (activeContact.linkedin_url) {
      // LinkedIn profile
      window.open(activeContact.linkedin_url, '_blank')
    } else if (activeCompany?.wttj_url) {
      // WTTJ
      window.open(activeCompany.wttj_url, '_blank')
    } else {
      alert("Aucune information de contact direct (LinkedIn, Email, WhatsApp) disponible.");
    }
  }

  // Création manuelle d'un contact
  const handleAddContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFirstName || !newCompanyId) return

    try {
      await addContact({
        company_id: newCompanyId,
        first_name: newFirstName,
        last_name: newLastName,
        email: newEmail,
        phone: newPhone,
        role: newRole,
        linkedin_url: newLinkedin,
        status: 'à contacter',
        channel: newChannel,
        notes: newNotes
      })

      // Reset
      setNewFirstName('')
      setNewLastName('')
      setNewRole('')
      setNewEmail('')
      setNewPhone('')
      setNewLinkedin('')
      setNewNotes('')
      setIsAddContactOpen(false)
      alert('Contact ajouté avec succès !')
    } catch (e: any) {
      alert(`Erreur: ${e.message}`)
    }
  }

  const handleDeleteContact = async (id: string, name: string) => {
    if (confirm(`Supprimer le contact "${name}" ?`)) {
      try {
        await deleteContact(id)
      } catch (err: any) {
        alert(err.message)
      }
    }
  }

  // Extraire les options uniques pour les filtres
  const uniqueProjects = Array.from(new Set(companies.map(c => c.project_name || 'Lexona')))
  const uniqueDomains = Array.from(new Set(companies.map(c => c.domain).filter(Boolean)))

  // Filtrer les contacts
  const filteredContacts = contacts.filter(contact => {
    const company = companies.find(c => c.id === contact.company_id)
    
    // Projet filter
    if (filterProject !== 'Tous') {
      const compProject = company?.project_name || 'Lexona'
      if (compProject !== filterProject) return false
    }

    // Statut filter
    if (filterStatus !== 'Tous' && contact.status !== filterStatus) return false

    // Domaine filter
    if (filterDomain !== 'Tous' && company?.domain !== filterDomain) return false

    // Recherche textuelle
    if (searchQuery.trim()) {
      const fullName = `${contact.first_name} ${contact.last_name || ''}`.toLowerCase()
      const roleLower = (contact.role || '').toLowerCase()
      const compNameLower = (company?.name || '').toLowerCase()
      const queryLower = searchQuery.toLowerCase()

      return fullName.includes(queryLower) || roleLower.includes(queryLower) || compNameLower.includes(queryLower)
    }

    return true
  })

  // Couleurs associées aux statuts
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'à contacter': return { bg: 'rgba(255, 214, 98, 0.12)', text: '#ffd662' }
      case 'contacté': return { bg: 'rgba(92, 225, 255, 0.12)', text: '#5ce1ff' }
      case 'à relancer': return { bg: 'rgba(244, 63, 94, 0.15)', text: '#f43f5e' }
      case 'relancé': return { bg: 'rgba(139, 92, 246, 0.15)', text: '#a78bfa' }
      case 'accepté': return { bg: 'rgba(88, 243, 156, 0.12)', text: '#58f39c' }
      case 'refusé': return { bg: 'rgba(255, 255, 255, 0.05)', text: 'rgba(255,255,255,0.4)' }
      default: return { bg: 'rgba(255, 255, 255, 0.05)', text: '#fff' }
    }
  }

  // Couleurs associées aux canaux
  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'linkedin': return '#0077b5'
      case 'email': return '#ea4335'
      case 'whatsapp': return '#25d366'
      case 'welcometothejungle': return '#ff5c5c'
      case 'indeed': return '#2164f3'
      default: return 'var(--text-muted)'
    }
  }

  return (
    <div className="workspace__content">
      {/* Header */}
      <div className="section-header">
        <div className="section-header__tabs">
          <p className="section-header__label">Personal CRM</p>
          <h1 style={{ margin: '8px 0', fontSize: '2rem', fontWeight: 700 }}>Contacts & Prospects</h1>
        </div>
        <div className="section-header__actions" style={{ display: 'flex', gap: '10px' }}>
          <button type="button" className="ghost-button" onClick={() => setIsJsonPanelOpen(!isJsonPanelOpen)}>
            📥 / 📤 JSON Tool
          </button>
          <button type="button" className="ghost-button" onClick={handleExport}>
            Export Backup
          </button>
          <button type="button" className="primary-button" onClick={() => setIsAddContactOpen(!isAddContactOpen)}>
            Ajouter contact
          </button>
        </div>
      </div>

      {/* JSON Import/Export Tool Panel */}
      {isJsonPanelOpen && (
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>JSON Prospect Tool (Import)</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Collez le contenu JSON de sauvegarde ci-dessous pour importer de nouveaux prospects et recruteurs directement.
          </p>
          <textarea
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
            style={{
              height: '140px',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              background: 'rgba(0,0,0,0.2)',
              color: '#34d399',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '12px'
            }}
            placeholder='{ "companies": [...], "contacts": [...] }'
          />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button className="ghost-button" onClick={() => setIsJsonPanelOpen(false)}>Annuler</button>
            <button className="primary-button" onClick={handleImportSubmit} style={{ background: '#10b981' }}>Importer</button>
          </div>
        </div>
      )}

      {/* Formulaire d'ajout contact */}
      {isAddContactOpen && (
        <form onSubmit={handleAddContactSubmit} className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Nouveau contact</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div className="modal-field">
              <span>Prénom *</span>
              <input type="text" required value={newFirstName} onChange={e => setNewFirstName(e.target.value)} placeholder="Ex: Marie" />
            </div>
            <div className="modal-field">
              <span>Nom</span>
              <input type="text" value={newLastName} onChange={e => setNewLastName(e.target.value)} placeholder="Ex: Dubois" />
            </div>
            <div className="modal-field">
              <span>Rattaché à l'entreprise *</span>
              <select required value={newCompanyId} onChange={e => setNewCompanyId(e.target.value)}>
                <option value="">-- Choisir une entreprise --</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
            <div className="modal-field">
              <span>Rôle / Poste</span>
              <input type="text" value={newRole} onChange={e => setNewRole(e.target.value)} placeholder="Ex: Talent Acquisition" />
            </div>
            <div className="modal-field">
              <span>Email</span>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Ex: marie@company.com" />
            </div>
            <div className="modal-field">
              <span>Téléphone / WhatsApp</span>
              <input type="text" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Ex: 0612345678" />
            </div>
            <div className="modal-field">
              <span>Canal initial</span>
              <select value={newChannel} onChange={e => setNewChannel(e.target.value as any)}>
                <option value="linkedin">LinkedIn</option>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="welcometothejungle">WTTJ</option>
                <option value="indeed">Indeed</option>
              </select>
            </div>
          </div>

          <div className="modal-field">
            <span>URL Profil LinkedIn</span>
            <input type="url" value={newLinkedin} onChange={e => setNewLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." />
          </div>

          <div className="modal-field">
            <span>Notes additionnelles</span>
            <textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Rencontrée via..." />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" className="ghost-button" onClick={() => setIsAddContactOpen(false)}>Annuler</button>
            <button type="submit" className="primary-button" style={{ background: '#6366f1' }}>Enregistrer</button>
          </div>
        </form>
      )}

      {/* Barre de Filtres */}
      <div className="panel" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <input
            type="text"
            className="modal-field"
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              padding: '10px 14px',
              color: '#fff'
            }}
            placeholder="Rechercher par nom, rôle, entreprise..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        
        {/* Projet */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Projet:</span>
          <select
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', background: '#0e111a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
          >
            <option value="Tous">Tous</option>
            {uniqueProjects.map(proj => (
              <option key={proj} value={proj}>{proj}</option>
            ))}
          </select>
        </div>

        {/* Domaine */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Domaine:</span>
          <select
            value={filterDomain}
            onChange={e => setFilterDomain(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', background: '#0e111a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
          >
            <option value="Tous">Tous</option>
            {uniqueDomains.map(dom => (
              <option key={dom} value={dom}>{dom}</option>
            ))}
          </select>
        </div>

        {/* Statut */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Statut:</span>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', background: '#0e111a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
          >
            <option value="Tous">Tous</option>
            <option value="à contacter">À contacter</option>
            <option value="contacté">Contacté</option>
            <option value="à relancer">À relancer</option>
            <option value="relancé">Relancé</option>
            <option value="accepté">Accepté</option>
            <option value="refusé">Refusé</option>
          </select>
        </div>
      </div>

      {/* Main Container Grid with Table and Message Writer Drawer */}
      <div style={{ display: 'grid', gridTemplateColumns: activeContact ? '2fr 1fr' : '1fr', gap: '24px', transition: 'all 0.3s' }}>
        
        {/* Table de Contacts */}
        <div className="panel" style={{ overflowX: 'auto' }}>
          {filteredContacts.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Nom & Rôle</th>
                  <th>Entreprise (Domaine)</th>
                  <th>Projet lié</th>
                  <th>Canal</th>
                  <th>Statut</th>
                  <th>Dernier Contact</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map(contact => {
                  const company = companies.find(c => c.id === contact.company_id)
                  const statusStyles = getStatusColor(contact.status)
                  
                  return (
                    <tr key={contact.id}>
                      {/* Nom / Rôle */}
                      <td>
                        <div style={{ fontWeight: 700, color: '#fff' }}>
                          {contact.first_name} {contact.last_name || ''}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {contact.role || '-'}
                        </div>
                      </td>

                      {/* Entreprise */}
                      <td>
                        <div style={{ fontWeight: 600 }}>{company?.name || 'Inconnue'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#a5b4fc' }}>{company?.domain || '-'}</div>
                      </td>

                      {/* Projet lié */}
                      <td>
                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{company?.project_name || 'Lexona'}</span>
                      </td>

                      {/* Canal */}
                      <td>
                        <span 
                          style={{ 
                            fontSize: '0.75rem', 
                            color: '#fff', 
                            background: getChannelColor(contact.channel),
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            textTransform: 'capitalize'
                          }}
                        >
                          {contact.channel}
                        </span>
                      </td>

                      {/* Statut avec pastilles colorées */}
                      <td>
                        <select
                          value={contact.status}
                          onChange={(e) => handleStatusChange(contact.id, e.target.value)}
                          className="status-pill"
                          style={{
                            background: statusStyles.bg,
                            color: statusStyles.text,
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            padding: '4px 10px'
                          }}
                        >
                          <option value="à contacter">🔴 À contacter</option>
                          <option value="contacté">🟡 Contacté</option>
                          <option value="à relancer">🟠 À relancer</option>
                          <option value="relancé">🟣 Relancé</option>
                          <option value="accepté">🟢 Accepté</option>
                          <option value="refusé">⚪ Refusé</option>
                        </select>
                      </td>

                      {/* Dernier contact */}
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {contact.last_contact_date ? new Date(contact.last_contact_date).toLocaleDateString('fr-FR') : 'Jamais'}
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() => handleOpenWriter(contact)}
                            style={{
                              padding: '6px 12px',
                              fontSize: '0.8rem',
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              borderRadius: '8px'
                            }}
                          >
                            💬 Rédiger
                          </button>
                          <button
                            type="button"
                            className="ghost-button tiny"
                            onClick={() => handleDeleteContact(contact.id, `${contact.first_name} ${contact.last_name || ''}`)}
                            style={{ color: '#ff6b6b' }}
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="page-placeholder">
              <div className="page-placeholder__icon">👥</div>
              <p className="page-placeholder__title">Aucun contact trouvé</p>
              <p className="page-placeholder__description">
                Modifiez vos filtres ou lancez une recherche de scraping pour populer la base.
              </p>
            </div>
          )}
        </div>

        {/* Message Writer Panel (Drawer à droite) */}
        {activeContact && (
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignSelf: 'start', position: 'sticky', top: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Rédacteur de Message</h3>
              <button 
                onClick={() => { setActiveContact(null); setActiveCompany(null); }}
                style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Destinataire</div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff' }}>
                {activeContact.first_name} {activeContact.last_name || ''} ({activeContact.role || 'Recruteur'})
              </div>
              <div style={{ fontSize: '0.8rem', color: '#a5b4fc', marginTop: '2px' }}>
                chez {activeCompany?.name}
              </div>
            </div>

            {/* Sélecteur de Template */}
            <div className="modal-field">
              <span>Sélectionner un template</span>
              <select 
                value={selectedTemplateId} 
                onChange={(e) => handleSelectTemplate(e.target.value, activeContact, activeCompany)}
                style={{ background: '#0e111a', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <option value="">-- Choisir un template --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Sujet généré */}
            {generatedSubject && (
              <div className="modal-field">
                <span>Sujet</span>
                <input 
                  type="text" 
                  value={generatedSubject} 
                  onChange={e => setGeneratedSubject(e.target.value)}
                  style={{ background: 'rgba(0,0,0,0.2)' }}
                />
              </div>
            )}

            {/* Message généré */}
            <div className="modal-field">
              <span>Message généré</span>
              <textarea 
                value={generatedBody} 
                onChange={e => setGeneratedBody(e.target.value)}
                style={{ height: '220px', background: 'rgba(0,0,0,0.2)', fontSize: '0.9rem', lineHeight: '1.4' }}
              />
            </div>

            {/* Boutons d'action */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              <button 
                type="button" 
                className="primary-button" 
                onClick={handleCopyMessage}
                style={{ justifyContent: 'center', background: 'linear-gradient(135deg, #6366f1, #3b82f6)' }}
              >
                📋 Copier le message
              </button>
              <button 
                type="button" 
                className="primary-button" 
                onClick={handleSend}
                style={{ justifyContent: 'center', background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                🚀 Ouvrir & Envoyer ({activeContact.channel})
              </button>
            </div>

            {/* Liens de contact de secours */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', fontSize: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', marginTop: '4px' }}>
              {activeContact.linkedin_url && (
                <a href={activeContact.linkedin_url} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'none' }}>🔗 LinkedIn</a>
              )}
              {activeContact.email && (
                <a href={`mailto:${activeContact.email}`} style={{ color: '#f87171', textDecoration: 'none' }}>✉️ Email</a>
              )}
              {activeContact.phone && (
                <a href={`https://wa.me/${activeContact.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" style={{ color: '#34d399', textDecoration: 'none' }}>💬 WhatsApp</a>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
