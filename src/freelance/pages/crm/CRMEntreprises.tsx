import { useState } from 'react'
import { useCRM } from '../../../shared/hooks/useCRM'

import '../../../App.css'

export default function CRMEntreprises() {
  const { companies, contacts, addCompany, deleteCompany } = useCRM()
  
  // États pour la création manuelle d'entreprise
  const [isAddFormOpen, setIsAddFormOpen] = useState(false)
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [project, setProject] = useState('Lexona')
  const [website, setWebsite] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [wttj, setWttj] = useState('')
  const [indeed, setIndeed] = useState('')
  const [description, setDescription] = useState('')

  // Gérer la soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return

    try {
      await addCompany({
        name,
        domain,
        website,
        linkedin_url: linkedin,
        wttj_url: wttj,
        indeed_url: indeed,
        description,
        project_name: project,
        source: 'manual'
      })
      
      // Reset form
      setName('')
      setDomain('')
      setProject('Lexona')
      setWebsite('')
      setLinkedin('')
      setWttj('')
      setIndeed('')
      setDescription('')
      setIsAddFormOpen(false)
      alert('Entreprise créée avec succès !')
    } catch (err: any) {
      alert(`Erreur: ${err.message}`)
    }
  }

  const handleDelete = async (id: string, companyName: string) => {
    if (confirm(`Voulez-vous vraiment supprimer l'entreprise "${companyName}" ? Tous les contacts associés seront supprimés.`)) {
      try {
        await deleteCompany(id)
      } catch (err: any) {
        alert(`Erreur de suppression: ${err.message}`)
      }
    }
  }

  // Obtenir le nombre de contacts pour une entreprise
  const getContactCount = (companyId: string) => {
    return contacts.filter(c => c.company_id === companyId).length
  }

  return (
    <div className="workspace__content">
      {/* Section Header */}
      <div className="section-header">
        <div className="section-header__tabs">
          <p className="section-header__label">Personal CRM</p>
          <h1 style={{ margin: '8px 0', fontSize: '2rem', fontWeight: 700 }}>Entreprises Cibles</h1>
        </div>
        <div className="section-header__actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => setIsAddFormOpen(!isAddFormOpen)}
          >
            {isAddFormOpen ? 'Fermer le formulaire' : 'Ajouter manuellement'}
          </button>
        </div>
      </div>

      {/* Formulaire d'ajout */}
      {isAddFormOpen && (
        <form onSubmit={handleSubmit} className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Nouvelle entreprise</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div className="modal-field">
              <span>Nom de l'entreprise *</span>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Lexona" />
            </div>
            <div className="modal-field">
              <span>Domaine / Secteur</span>
              <input type="text" value={domain} onChange={e => setDomain(e.target.value)} placeholder="Ex: FinTech, SaaS" />
            </div>
            <div className="modal-field">
              <span>Projet rattaché</span>
              <select value={project} onChange={e => setProject(e.target.value)}>
                <option value="Lexona">Lexona</option>
                <option value="SurgiLink">SurgiLink</option>
                <option value="Casper">Casper</option>
                <option value="Wavely">Wavely</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
            <div className="modal-field">
              <span>Site Web</span>
              <input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." />
            </div>
            <div className="modal-field">
              <span>LinkedIn</span>
              <input type="url" value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="https://linkedin.com/company/..." />
            </div>
            <div className="modal-field">
              <span>WTTJ</span>
              <input type="url" value={wttj} onChange={e => setWttj(e.target.value)} placeholder="https://welcometothejungle.com/..." />
            </div>
            <div className="modal-field">
              <span>Indeed</span>
              <input type="url" value={indeed} onChange={e => setIndeed(e.target.value)} placeholder="https://indeed.com/..." />
            </div>
          </div>

          <div className="modal-field">
            <span>Description de l'activité / Projet de recrutement</span>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Recherche un développeur mobile iOS..." />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button type="button" className="ghost-button" onClick={() => setIsAddFormOpen(false)}>Annuler</button>
            <button type="submit" className="primary-button" style={{ background: '#6366f1' }}>Enregistrer</button>
          </div>
        </form>
      )}

      {/* Liste des entreprises */}
      <div className="panel">
        {companies.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Entreprise</th>
                <th>Secteur / Domaine</th>
                <th>Projet lié</th>
                <th>Description / Opportunité</th>
                <th style={{ textAlign: 'center' }}>Contacts</th>
                <th>Sources / Liens</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {companies.map((comp) => (
                <tr key={comp.id}>
                  {/* Nom */}
                  <td style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>
                    {comp.name}
                  </td>
                  
                  {/* Secteur */}
                  <td>
                    {comp.domain ? (
                      <span className="status-pill status-pill--progress" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                        {comp.domain}
                      </span>
                    ) : '-'}
                  </td>
                  
                  {/* Projet lié */}
                  <td>
                    <span className="status-pill status-pill--open" style={{ fontSize: '0.75rem', fontWeight: 600, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)' }}>
                      {comp.project_name || 'Lexona'}
                    </span>
                  </td>
                  
                  {/* Description */}
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={comp.description}>
                    {comp.description || 'Aucune description disponible.'}
                  </td>

                  {/* Nombre de contacts */}
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#a5b4fc' }}>
                    {getContactCount(comp.id)}
                  </td>

                  {/* Liens */}
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {comp.website && (
                        <a href={comp.website} target="_blank" rel="noreferrer" title="Site Web" style={{ fontSize: '1rem', textDecoration: 'none' }}>🌐</a>
                      )}
                      {comp.linkedin_url && (
                        <a href={comp.linkedin_url} target="_blank" rel="noreferrer" title="LinkedIn" style={{ fontSize: '1rem', textDecoration: 'none' }}>💼</a>
                      )}
                      {comp.wttj_url && (
                        <a href={comp.wttj_url} target="_blank" rel="noreferrer" title="Welcome to the Jungle" style={{ fontSize: '1rem', textDecoration: 'none' }}>🌴</a>
                      )}
                      {comp.indeed_url && (
                        <a href={comp.indeed_url} target="_blank" rel="noreferrer" title="Indeed" style={{ fontSize: '1rem', textDecoration: 'none' }}>🔍</a>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td>
                    <button
                      type="button"
                      className="ghost-button tiny"
                      onClick={() => handleDelete(comp.id, comp.name)}
                      style={{ color: '#ff6b6b' }}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="page-placeholder">
            <div className="page-placeholder__icon">🏢</div>
            <p className="page-placeholder__title">Aucune entreprise ciblée</p>
            <p className="page-placeholder__description">
              Utilisez le scraper pour importer automatiquement des entreprises ou ajoutez-les manuellement.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
