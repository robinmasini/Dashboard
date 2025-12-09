import { Navigate } from 'react-router-dom'

/**
 * Redirection par défaut vers les tickets
 */
export default function Commandes() {
  return <Navigate to="/dashboard/commandes/tickets" replace />
}

