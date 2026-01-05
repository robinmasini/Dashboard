import { useState } from 'react'
import { useClients } from '../../shared'
import ActionModal from '../components/ActionModal'
import { actionSchemas } from '../../data/dashboard'
import { uploadFile } from '../../shared/services/uploadService'
import '../../App.css'

/**
 * Page Clients Freelance - Gestion des clients
 * CRUD complet pour les clients
 */
export default function Clients() {
  const { clients, loading, addClient, updateClient, deleteClient } = useClients()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalSchema, setModalSchema] = useState<any>(null)
  const [editingClient, setEditingClient] = useState<any>(null)

  const handleOpenModal = () => {
    setEditingClient(null)
    setModalSchema(actionSchemas['clients'] || actionSchemas['default'])
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setModalSchema(null)
    setEditingClient(null)
  }

  const handleModalSubmit = async (values: Record<string, string>) => {
    try {
      if (editingClient) {
        await updateClient(editingClient.id, {
          name: values.client,
          email: values.email,
          auth_user_id: values.auth_user_id, // Save auth_user_id
          access_code: values.access_code,
          contact_name: values.contact,
          industry: values.industry,
          status: values.status as any,
          // notes: values.notes // Add notes column if needed in DB schema
        })
      } else {
        const accessCode = values.access_code || Math.floor(1000 + Math.random() * 9000).toString()
        await addClient({
          name: values.client,
          email: values.email,
          auth_user_id: values.auth_user_id, // Save auth_user_id
          contact_name: values.contact,
          industry: values.industry,
          status: values.status as any || 'Prospect',
          access_code: accessCode,
        })
        alert(`Client créé avec le code d'accès : ${accessCode}`)
      }
    } catch (err) {
      console.error('Error saving client:', err)
      alert('Erreur lors de la sauvegarde')
    }
    handleCloseModal()
  }

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Supprimer le client "${name}" ?`)) {
      try {
        await deleteClient(id)
      } catch (err) {
        console.error('Error deleting client:', err)
        alert('Erreur lors de la suppression')
      }
    }
  }

  const handleStatusChange = async (id: string, status: any) => {
    try {
      await updateClient(id, { status })
    } catch (err) {
      console.error('Error updating client:', err)
    }
  }

  const handleEdit = (client: any) => {
    setEditingClient(client)
    setModalSchema(actionSchemas['clients'])
    setIsModalOpen(true)
  }

  const getInitialValues = () => {
    if (!editingClient) return undefined
    return {
      client: editingClient.name,
      email: editingClient.email || '',
      auth_user_id: editingClient.auth_user_id || '', // Load auth_user_id
      access_code: editingClient.access_code || '',
      contact: editingClient.contact_name,
      industry: editingClient.industry,
      status: editingClient.status,
      notes: '' // Add notes if available in client object
    }
  }

  // État pour suivre les uploads en cours
  const [uploadingAvatars, setUploadingAvatars] = useState<Record<string, boolean>>({})

  // Fonction pour uploader un avatar vers Supabase Storage
  const handleAvatarUpload = async (clientId: string, file: File) => {
    if (!file) return

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image valide (jpg, png, gif, etc.)')
      return
    }

    // Limite à 2MB
    if (file.size > 2 * 1024 * 1024) {
      alert(`L'image est trop grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum: 2MB`)
      return
    }

    setUploadingAvatars(prev => ({ ...prev, [clientId]: true }))

    try {
      // Upload vers Supabase Storage
      const { url, error } = await uploadFile(file, 'avatars')

      if (error) {
        alert(`Erreur lors de l'upload: ${error}`)
        return
      }

      if (url) {
        // Mettre à jour le client avec l'URL de l'avatar
        await updateClient(clientId, { avatar_url: url })
        alert('✅ Avatar mis à jour avec succès !')
      }
    } catch (err: any) {
      console.error('Error uploading avatar:', err)
      alert(`Erreur: ${err.message}`)
    } finally {
      setUploadingAvatars(prev => ({ ...prev, [clientId]: false }))
    }
  }

  // Fonction pour obtenir l'avatar d'un client (depuis DB)
  const getClientAvatar = (client: any): string | null => {
    return client.avatar_url || null
  }

  return (
    <div className="workspace__content">
      <div className="section-header">
        <div className="section-header__tabs">
          <p className="section-header__label">Clients</p>
          <h1 style={{ margin: '8px 0', fontSize: '2rem', fontWeight: 700 }}>Gestion des clients</h1>
        </div>
        <div className="section-header__actions">
          <button
            type="button"
            className="primary-button"
            onClick={handleOpenModal}
            style={{
              background: 'linear-gradient(135deg, #6823ff, #3b4fff)',
            }}
          >
            Ajouter un client
          </button>
        </div>
      </div>

      <ActionModal
        open={isModalOpen}
        schema={modalSchema}
        onClose={handleCloseModal}
        onSubmit={handleModalSubmit}
        initialValues={getInitialValues()}
      />

      <div className="panel">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Chargement des clients...
          </div>
        ) : clients.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Contact</th>
                <th>Industrie</th>
                <th>Mot de passe</th>
                <th>Statut</th>
                <th>Date d'ajout</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td style={{ fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Avatar/Logo avec upload */}
                      <label style={{ cursor: 'pointer', position: 'relative' }}>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          disabled={uploadingAvatars[client.id]}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleAvatarUpload(client.id, file)
                          }}
                        />
                        <div style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '50%',
                          background: getClientAvatar(client)
                            ? `url(${getClientAvatar(client)}) center/cover no-repeat`
                            : 'linear-gradient(135deg, #6366f1, #3b82f6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem',
                          color: 'white',
                          fontWeight: 700,
                          border: '2px solid rgba(255,255,255,0.1)',
                          transition: 'all 0.2s',
                          opacity: uploadingAvatars[client.id] ? 0.5 : 1
                        }}>
                          {uploadingAvatars[client.id] ? '...' : (!getClientAvatar(client) && client.name.charAt(0).toUpperCase())}
                        </div>
                      </label>

                      {/* Nom et email */}
                      <div>
                        {client.name}
                        {client.email && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                            {client.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{client.contact_name || '-'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{client.industry || '-'}</td>
                  <td>
                    <code style={{
                      background: 'rgba(92, 225, 255, 0.1)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      fontSize: '0.9rem'
                    }}>
                      {client.access_code}
                    </code>
                  </td>
                  <td>
                    <select
                      value={client.status}
                      onChange={(e) => handleStatusChange(client.id, e.target.value as any)}
                      className={`status-pill status-pill--${client.status === 'En cours' ? 'progress' :
                        client.status === 'Terminé' ? 'closed' :
                          'open'
                        }`}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'inherit',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="Prospect">Prospect</option>
                      <option value="En cours">En cours</option>
                      <option value="Terminé">Terminé</option>
                    </select>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {client.created_at ? new Date(client.created_at).toLocaleDateString('fr-FR') : '-'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="ghost-button tiny"
                        onClick={() => handleEdit(client)}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="ghost-button tiny"
                        onClick={() => handleDelete(client.id, client.name)}
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
            <div className="page-placeholder__icon">👥</div>
            <p className="page-placeholder__title">Aucun client</p>
            <p className="page-placeholder__description">
              Ajoutez votre premier client pour commencer.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

