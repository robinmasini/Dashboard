import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../../shared/services/supabaseClient'
import '../../../App.css'

/**
 * Magic Login - Connexion automatique via lien sécurisé
 * URL format: /auth/auto?t=BASE64_ENCODED_TOKEN
 * 
 * Le token contient les credentials encodés en base64
 * Format du token: base64(email:password)
 * 
 * Génération du lien (à faire côté serveur ou manuellement):
 * const token = btoa('email@example.com:password123')
 * URL: /auth/auto?t=TOKEN
 */
export default function AutoLogin() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading')
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        const performAutoLogin = async () => {
            const token = searchParams.get('t')

            if (!token) {
                setStatus('error')
                setErrorMessage('Lien invalide')
                return
            }

            try {
                // Décoder le token base64
                const decoded = atob(token)
                const [email, password] = decoded.split(':')

                if (!email || !password) {
                    setStatus('error')
                    setErrorMessage('Lien mal formaté')
                    return
                }

                // Connexion avec les credentials décodés
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password: password.trim(),
                })

                if (signInError) {
                    console.error('Auto login error:', signInError)
                    setStatus('error')
                    setErrorMessage('Identifiants invalides')
                    return
                }

                setStatus('success')
                // Redirection vers le dashboard après connexion réussie
                setTimeout(() => {
                    window.location.href = '/dashboard'
                }, 800)

            } catch (err) {
                console.error('Auto login decode error:', err)
                setStatus('error')
                setErrorMessage('Lien invalide ou corrompu')
            }
        }

        performAutoLogin()
    }, [searchParams, navigate])

    return (
        <div className="auth-container">
            <div className="auth-card" style={{ textAlign: 'center' }}>
                {status === 'loading' && (
                    <>
                        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🔐</div>
                        <h1 className="auth-card__title">Connexion en cours...</h1>
                        <p className="auth-card__subtitle">Veuillez patienter</p>
                        <div style={{
                            marginTop: '24px',
                            width: '40px',
                            height: '40px',
                            border: '3px solid rgba(104, 35, 255, 0.2)',
                            borderTop: '3px solid #6823ff',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            margin: '24px auto'
                        }} />
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>✅</div>
                        <h1 className="auth-card__title">Connexion réussie !</h1>
                        <p className="auth-card__subtitle">Redirection vers votre espace...</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>❌</div>
                        <h1 className="auth-card__title">Erreur</h1>
                        <p className="auth-card__subtitle" style={{ color: '#ff6b6b' }}>{errorMessage}</p>
                        <button
                            className="primary-button"
                            style={{ marginTop: '24px' }}
                            onClick={() => navigate('/auth/client')}
                        >
                            Retour à la connexion
                        </button>
                    </>
                )}
            </div>

            <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    )
}
