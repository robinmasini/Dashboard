import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../shared/hooks/useAuth'
import '../../../App.css'

export default function ClientLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Veuillez remplir tous les champs')
      return
    }

    setIsSubmitting(true)
    setError('')

    const { success, error } = await login(email, password)

    if (success) {
      // Force reload to ensure clean state and avoid race conditions
      window.location.href = '/dashboard'
    } else {
      setError(error || 'Email ou mot de passe incorrect')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-card__title">Espace Client</h1>
        <p className="auth-card__subtitle">Connectez-vous à votre projet</p>

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              disabled={isSubmitting}
              autoComplete="email"
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '1rem',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.03)',
                color: '#fff',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Mot de passe
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isSubmitting}
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  paddingRight: '45px',
                  fontSize: '1rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  color: '#fff',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  padding: '4px',
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && <div className="auth-error" style={{ marginBottom: '20px', color: '#ff6b6b' }}>{error}</div>}

          <button
            type="submit"
            className="primary-button"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Connexion...' : 'Se connecter'}
          </button>

          {/* Lien Freelance masqué en production - visible seulement si VITE_ENABLE_ADMIN */}
          {import.meta.env.VITE_ENABLE_ADMIN === 'true' && (
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <a
                href="/auth/freelance"
                onClick={(e) => { e.preventDefault(); navigate('/auth/freelance'); }}
                style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}
              >
                Accès Freelance
              </a>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
