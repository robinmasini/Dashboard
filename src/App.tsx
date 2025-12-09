import { Routes, Route, Navigate } from 'react-router-dom'
import { UserRole } from './shared/types/roles'
import { AuthProvider } from './shared/contexts/AuthProvider'
import ProtectedRoute from './shared/components/ProtectedRoute'
import ClientLogin from './client/pages/auth/ClientLogin'
import FreelanceLogin from './freelance/pages/auth/FreelanceLogin'
import DashboardLayout from './layouts/DashboardLayout'
import LandingPage from './pages/LandingPage'
import './App.css'

// Import des pages côté client
import ClientVotreProjet from './client/pages/votre-projet'
import ClientTickets from './client/pages/commandes/tickets'
import ClientDevis from './client/pages/commandes/devis'
import ClientFacturation from './client/pages/commandes/facturation'
import ClientPlanning from './client/pages/planning/todo'

// Import des pages côté freelance
import FreelanceCommandes from './freelance/pages/Commandes'
import FreelancePlanning from './freelance/pages/Planning'
import FreelanceClients from './freelance/pages/Clients'
import FreelancePerformance from './freelance/pages/performance'
import FreelanceTimeTracking from './freelance/pages/time-tracking'

// Admin activé en développement OU si variable VITE_ENABLE_ADMIN définie
// En production sur Vercel, DEV sera false et la variable non définie → admin désactivé
const ADMIN_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_ADMIN === 'true'

function AppRoutes() {
  return (
    <Routes>
      {/* Landing Page - Page d'accueil publique */}
      <Route path="/" element={<LandingPage />} />

      {/* Routes d'authentification */}
      <Route path="/auth/client" element={<ClientLogin />} />

      {/* Login Freelance - seulement si admin activé */}
      {ADMIN_ENABLED && (
        <Route path="/auth/freelance" element={<FreelanceLogin />} />
      )}

      {/* ROUTING CLIENT - Accessible publiquement après login */}
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute allowedRole={UserRole.CLIENT}>
            <DashboardLayout role={UserRole.CLIENT}>
              <Routes>
                <Route index element={<Navigate to="projet" replace />} />
                <Route path="projet" element={<ClientVotreProjet />} />
                <Route path="commandes/tickets" element={<ClientTickets />} />
                <Route path="commandes/devis" element={<ClientDevis />} />
                <Route path="commandes/facturation" element={<ClientFacturation />} />
                <Route path="commandes" element={<Navigate to="commandes/tickets" replace />} />
                <Route path="planning" element={<ClientPlanning />} />
              </Routes>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* ROUTING ADMIN/FREELANCE - Seulement si activé via env */}
      {ADMIN_ENABLED && (
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRole={UserRole.FREELANCE}>
              <DashboardLayout role={UserRole.FREELANCE}>
                <Routes>
                  <Route index element={<Navigate to="performance" replace />} />
                  <Route path="performance" element={<FreelancePerformance />} />
                  <Route path="commandes/*" element={<FreelanceCommandes />} />
                  <Route path="time-tracking" element={<FreelanceTimeTracking />} />
                  <Route path="planning" element={<FreelancePlanning />} />
                  <Route path="clients" element={<FreelanceClients />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
      )}

      {/* Catch all - retour à la landing page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

