import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../../shared/services/supabaseClient'
import '../../../App.css'

/**
 * Magic Login - Connexion automatique via token unique
 * URL format: /auth/magic/:token
 * 
 * Le token est stocké dans le champ magic_token de la table clients
 * Lié à l'auth_user_id pour authentifier l'utilisateur
 */
export default function MagicLogin() {
    const { token } = useParams<{ token: string }>()
    const navigate = useNavigate()
    const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading')
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        const performMagicLogin = async () => {
            if (!token) {
                setStatus('error')
                setErrorMessage('Token manquant')
                return
            }

            try {
                // 1. Récupérer le client via le magic_token
                const { data: client, error: clientError } = await supabase
                    .from('clients')
                    .select('id, name, email, auth_user_id, magic_token')
                    .eq('magic_token', token)
                    .single()

                if (clientError || !client) {
                    setStatus('error')
                    setErrorMessage('Lien invalide ou expiré')
                    return
                }

                if (!client.auth_user_id) {
                    setStatus('error')
                    setErrorMessage('Compte non configuré')
                    return
                }

                // 2. Récupérer l'email de l'utilisateur auth
                const { data: authUser, error: authError } = await supabase
                    .from('clients')
                    .select('email')
                    .eq('auth_user_id', client.auth_user_id)
                    .single()

                if (authError || !authUser?.email) {
                    setStatus('error')
                    setErrorMessage('Utilisateur non trouvé')
                    return
                }

                // 3. Générer un lien de connexion magique Supabase
                // Note: Pour un magic link Supabase, on utilise signInWithOtp
                // Mais ici on va utiliser une approche différente avec un mot de passe temporaire

                // Alternative: Utiliser le magic_token comme mot de passe caché
                // Cette approche nécessite que le mot de passe soit défini = magic_token
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: client.email,
                    password: token, // Le magic_token sert aussi de mot de passe
                })

                if (signInError) {
                    console.error('Magic login error:', signInError)
                    setStatus('error')
                    setErrorMessage('Erreur de connexion automatique')
                    return
                }

                setStatus('success')
                // Redirection vers le dashboard après connexion réussie
                setTimeout(() => {
                    window.location.href = '/dashboard'
                }, 1000)

            } catch (err) {
                console.error('Magic login error:', err)
                setStatus('error')
                setErrorMessage('Erreur inattendue')
            }
        }

        performMagicLogin()
    }, [token, navigate])

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
