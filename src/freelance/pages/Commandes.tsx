import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTickets, useProposals, useInvoices, useClients } from '../../shared'
import SectionTabs from '../../shared/components/SectionTabs'
import TicketsTable from '../components/TicketsTable'
import ActionModal from '../components/ActionModal'
import { actionSchemas } from '../../data/dashboard'
import '../../App.css'

const commandesTabs = [
  { id: 'tickets', label: 'Tickets', path: '/admin/commandes/tickets' },
  { id: 'devis', label: 'Devis', path: '/admin/commandes/devis' },
  { id: 'facturation', label: 'Facturation', path: '/admin/commandes/facturation' },
]

/**
 * Page Commandes Freelance - Gestion complète des tickets, devis et factures
 * CRUD complet pour toutes les entités
 */
export default function Commandes() {
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('tickets')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalSchema, setModalSchema] = useState<any>(null)
  const [editingItem, setEditingItem] = useState<any>(null)

  // Synchroniser l'onglet actif avec l'URL
  useEffect(() => {
    if (location.pathname.includes('devis')) {
      setActiveTab('devis')
    } else if (location.pathname.includes('facturation')) {
      setActiveTab('facturation')
    } else {
      setActiveTab('tickets')
    }
  }, [location.pathname])

  const { clients } = useClients()

  // Hooks Supabase (sans filtre clientId - voit tout)
  const { tickets, loading: loadingTickets, addTicket, updateTicket, deleteTicket, refresh: refreshTickets } = useTickets()
  const { proposals, loading: loadingProposals, addProposal, updateProposal, deleteProposal, refresh: refreshProposals } = useProposals()
  const { invoices, loading: loadingInvoices, addInvoice, updateInvoice, deleteInvoice, refresh: refreshInvoices } = useInvoices()

  // Modal Handlers
  const handleOpenModal = () => {
    setEditingItem(null)
    const schemaKey = activeTab === 'tickets'
      ? 'commandes:tickets'
      : activeTab === 'devis'
        ? 'commandes:quotes'
        : 'commandes:invoicing'

    const schema = { ...(actionSchemas[schemaKey] || actionSchemas['default']) }

    // Populate client options dynamically for all tabs
    const clientField = schema.fields.find(f => f.id === 'client')
    if (clientField) {
      clientField.type = 'select' // Ensure it's a select
      clientField.options = ['(Aucun)', ...clients.map(c => c.name)]
    }

    setModalSchema(schema)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setModalSchema(null)
    setEditingItem(null)
  }

  const handleModalSubmit = async (values: Record<string, string>) => {
    try {
      // Resolve client ID
      let clientId: string = ''
      // Find client by name
      const selectedClientName = values.client
      if (selectedClientName && selectedClientName !== '(Aucun)') {
        const client = clients.find(c => c.name === selectedClientName)
        if (client) clientId = client.id
      }

      // Handle PDF upload - if it's a base64 data URL, upload to Supabase Storage
      let pdfUrl: string | undefined = undefined
      if (values.pdf) {
        if (values.pdf.startsWith('data:')) {
          // It's a base64 data URL - need to upload to Storage
          console.log('Uploading PDF to Supabase Storage...')
          try {
            // Convert base64 to File
            const response = await fetch(values.pdf)
            const blob = await response.blob()
            const fileName = values.pdf_name || `document_${Date.now()}.pdf`
            const file = new File([blob], fileName, { type: 'application/pdf' })

            // Determine folder based on active tab
            const folder = activeTab === 'tickets' ? 'tickets' :
              activeTab === 'devis' ? 'proposals' : 'invoices'

            // Import and use uploadFile
            const { uploadFile } = await import('../../shared/services/uploadService')
            const { url, error } = await uploadFile(file, folder)

            if (error) {
              console.error('PDF upload error:', error)
              alert(`Erreur lors de l'upload du PDF: ${error}`)
              return
            }

            pdfUrl = url || undefined
            console.log('PDF uploaded successfully:', pdfUrl)
          } catch (uploadErr) {
            console.error('Failed to upload PDF:', uploadErr)
            alert('Erreur lors de l\'upload du PDF. Vérifiez la connexion.')
            return
          }
        } else if (values.pdf.startsWith('http')) {
          // It's already a URL (existing PDF)
          pdfUrl = values.pdf
        }
      }

      if (activeTab === 'tickets') {
        if (editingItem) {
          await updateTicket(editingItem.id, {
            client_id: clientId || editingItem.client_id,
            type: values.type as any,
            title: values.title,
            description: values.notes,
            eta: values.estimate ? `${values.estimate}h` : undefined,
            price: values.price ? Number(values.price) : undefined,
            pdf_url: pdfUrl,
          })
        } else {
          await addTicket({
            client_id: clientId,
            type: values.type as any,
            title: values.title,
            description: values.notes,
            eta: values.estimate ? `${values.estimate}h` : '0h',
            price: values.price ? Number(values.price) : 0,
            status: 'Ouvert',
            pdf_url: pdfUrl,
          } as any)
        }
      } else if (activeTab === 'devis') {
        if (editingItem) {
          await updateProposal(editingItem.id, {
            title: values.title,
            amount: values.amount,
            client_id: clientId || editingItem.client_id,
            pdf_url: pdfUrl,
          })
        } else {
          await addProposal({
            client_id: clientId,
            title: values.title,
            subtitle: values.client,
            amount: values.amount,
            date: values.delivery || new Date().toISOString(),
            status: 'En cours',
            pdf_url: pdfUrl,
          } as any)
        }
      } else {
        if (editingItem) {
          await updateInvoice(editingItem.id, {
            amount: values.amount,
            due_date: values.dueDate,
            status: values.status as any,
            client_id: clientId || editingItem.client_id,
            notes: values.notes,
            pdf_url: pdfUrl,
          })
        } else {
          await addInvoice({
            client_id: clientId,
            invoice_number: 'DRAFT',
            amount: values.amount,
            due_date: values.dueDate,
            status: values.status as any,
            notes: values.notes,
            pdf_url: pdfUrl,
          } as any)
        }
      }
    } catch (err) {
      console.error('Error submitting form:', err)
    }

    // Refresh data after submission
    if (activeTab === 'tickets') {
      await refreshTickets()
    } else if (activeTab === 'devis') {
      await refreshProposals()
    } else {
      await refreshInvoices()
    }

    handleCloseModal()
  }

  const handleStatusChange = async (id: string, status: any) => {
    try {
      await updateTicket(id, { status })
    } catch (err) {
      console.error('Error updating ticket status:', err)
    }
  }

  const handleEditTicket = (ticket: any) => {
    setEditingItem(ticket)

    const schema = { ...actionSchemas['commandes:tickets'] }
    const clientField = schema.fields.find(f => f.id === 'client')
    if (clientField) {
      clientField.type = 'select'
      clientField.options = ['(Aucun)', ...clients.map(c => c.name)]
    }
    setModalSchema(schema)
    setIsModalOpen(true)
  }

  const handleDeleteTicket = async (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer ce ticket ?')) {
      try {
        await deleteTicket(id)
      } catch (err) {
        console.error('Error deleting ticket:', err)
      }
    }
  }

  const handleEditProposal = (proposal: any) => {
    setEditingItem(proposal)
    const schema = { ...actionSchemas['commandes:quotes'] }
    const clientField = schema.fields.find(f => f.id === 'client')
    if (clientField) {
      clientField.type = 'select'
      clientField.options = ['(Aucun)', ...clients.map(c => c.name)]
    }
    setModalSchema(schema)
    setIsModalOpen(true)
  }

  const handleDeleteProposal = async (id: string) => {
    if (confirm('Supprimer ce devis ?')) {
      await deleteProposal(id)
    }
  }

  const handleEditInvoice = (invoice: any) => {
    setEditingItem(invoice)
    const schema = { ...actionSchemas['commandes:invoicing'] }
    const clientField = schema.fields.find(f => f.id === 'client')
    if (clientField) {
      clientField.type = 'select'
      clientField.options = ['(Aucun)', ...clients.map(c => c.name)]
    }
    setModalSchema(schema)
    setIsModalOpen(true)
  }

  const handleDeleteInvoice = async (id: string) => {
    if (confirm('Supprimer cette facture ?')) {
      await deleteInvoice(id)
    }
  }

  const getInitialValues = (): Record<string, string> | undefined => {
    if (!editingItem) return undefined
    if (activeTab === 'tickets') {
      const clientName = clients.find(c => c.id === editingItem.client_id)?.name || editingItem.client || '(Aucun)'
      return {
        client: clientName,
        type: editingItem.type || 'Design',
        title: editingItem.title || '',
        estimate: editingItem.eta ? String(editingItem.eta).replace('h', '') : '',
        price: editingItem.price ? String(editingItem.price) : '',
        pdf: editingItem.pdf_url || '',
        notes: editingItem.description || ''
      }
    }
    if (activeTab === 'devis') {
      return {
        client: editingItem.client_name || editingItem.client || '',
        title: editingItem.title || '',
        amount: editingItem.amount ? String(editingItem.amount).replace(/[^\d.,]/g, '') : '',
        delivery: editingItem.delivery_date || '',
        pdf: editingItem.pdf_url || '',
        notes: editingItem.notes || ''
      }
    }
    if (activeTab === 'facturation') {
      return {
        client: editingItem.client_name || editingItem.client || '',
        amount: editingItem.amount ? String(editingItem.amount).replace(/[^\d.,]/g, '') : '',
        dueDate: editingItem.due_date || '',
        status: editingItem.status || 'À envoyer',
        pdf: editingItem.pdf_url || '',
        notes: editingItem.notes || ''
      }
    }
    return undefined
  }

  return (
    <div className="workspace__content">
      <div className="section-header">
        <SectionTabs label="Commandes" tabs={commandesTabs} />
        <div className="section-header__actions">
          <button
            type="button"
            className="primary-button"
            onClick={handleOpenModal}
            style={{
              background: 'linear-gradient(135deg, #6823ff, #3b4fff)',
            }}
          >
            {activeTab === 'tickets' ? 'Ajouter un ticket' :
              activeTab === 'devis' ? 'Ajouter un devis' :
                'Ajouter une facture'}
          </button>
        </div>
      </div>

      {/* Action Modal */}
      <ActionModal
        open={isModalOpen}
        schema={modalSchema}
        onClose={handleCloseModal}
        onSubmit={handleModalSubmit}
        initialValues={getInitialValues()}
      />

      {/* Tickets Tab */}
      {activeTab === 'tickets' && (
        loadingTickets ? (
          <div className="panel">
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Chargement des tickets...
            </div>
          </div>
        ) : (
          <TicketsTable
            tickets={tickets as any}
            clients={clients}
            onEdit={handleEditTicket}
            onStatusChange={handleStatusChange}
            onDelete={handleDeleteTicket}
          />
        )
      )}

      {/* Devis Tab */}
      {activeTab === 'devis' && (
        <div className="panel">
          {loadingProposals ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Chargement des devis...
            </div>
          ) : proposals.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {proposals.map((proposal) => (
                <div key={proposal.id} style={{
                  padding: '20px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '18px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '1.1rem' }}>
                      {proposal.title}
                    </p>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {proposal.subtitle} • {proposal.date}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                      {proposal.amount}
                    </p>
                    <span className={`status-pill status-pill--${proposal.status === 'Signé' ? 'signed' : 'pending'}`}>
                      {proposal.status}
                    </span>

                    {/* Actions Devis */}
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '12px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '12px' }}>
                      {proposal.pdf_url ? (
                        <a
                          href={proposal.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ghost-button tiny"
                          title="Ouvrir le devis PDF"
                          style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', color: '#a78bfa' }}
                        >
                          📄 Voir PDF
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="ghost-button tiny"
                          onClick={() => alert('Aucun PDF attaché à ce devis. Modifiez le devis pour ajouter un PDF.')}
                          title="Aucun PDF"
                          style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.5 }}
                        >
                          📄 Pas de PDF
                        </button>
                      )}
                      {proposal.status !== 'Signé' && (
                        <button
                          type="button"
                          className="ghost-button tiny"
                          onClick={async () => {
                            if (confirm('Marquer ce devis comme accepté ?')) {
                              await updateProposal(proposal.id, { status: 'Signé' })
                            }
                          }}
                          title="Accepter le devis"
                          style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#58f39c' }}
                        >
                          ✅ Accepter
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      className="ghost-button tiny"
                      onClick={() => handleEditProposal(proposal)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="ghost-button tiny"
                      onClick={() => handleDeleteProposal(proposal.id)}
                      style={{ color: '#ff6b6b' }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="page-placeholder">
              <div className="page-placeholder__icon">📝</div>
              <p className="page-placeholder__title">Aucun devis</p>
              <p className="page-placeholder__description">
                Créez votre premier devis.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Facturation Tab */}
      {activeTab === 'facturation' && (
        <div className="panel">
          {loadingInvoices ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Chargement des factures...
            </div>
          ) : invoices.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Montant</th>
                  <th>Échéance</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td style={{ fontWeight: 600 }}>{invoice.invoice_number || invoice.id.substring(0, 8)}</td>
                    <td style={{ fontSize: '1.1rem', fontWeight: 600 }}>{invoice.amount}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{invoice.due_date}</td>
                    <td>
                      <select
                        value={invoice.status}
                        onChange={async (e) => {
                          await updateInvoice(invoice.id, { status: e.target.value as any })
                        }}
                        className={`status-pill status-pill--${invoice.status === 'À envoyer' ? 'pending' :
                          invoice.status === 'Envoyée' ? 'sent' :
                            'paid'
                          }`}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'inherit',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="À envoyer">À envoyer</option>
                        <option value="Envoyée">Envoyée</option>
                        <option value="Payée">Payée</option>
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="ghost-button tiny"
                          onClick={() => handleEditInvoice(invoice)}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="ghost-button tiny"
                          onClick={() => handleDeleteInvoice(invoice.id)}
                          style={{ color: '#ff6b6b' }}
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="page-placeholder">
              <div className="page-placeholder__icon">💰</div>
              <p className="page-placeholder__title">Aucune facture</p>
              <p className="page-placeholder__description">
                Créez votre première facture.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

