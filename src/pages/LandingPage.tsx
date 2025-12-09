import { useNavigate } from 'react-router-dom'
import logo from '../assets/logo-ds.png'
import './LandingPage.css'

/**
 * Landing Page temporaire pour robinmasini.com
 * Affiche un message "Site vitrine bientôt disponible" avec accès au dashboard
 */
export default function LandingPage() {
    const navigate = useNavigate()

    return (
        <div className="landing-page">
            <div className="landing-content">
                {/* Logo */}
                <img src={logo} alt="Robin Masini" className="landing-logo" />
                <p className="landing-subtitle">
                    UX/UI & Product Designer Web & Mobile<br />
                    IA Développeur Full-Stack Javascript Web & Mobile
                </p>

                {/* Message temporaire */}
                <div className="landing-message">
                    <span className="landing-badge">En construction</span>
                    <p>Site vitrine bientôt disponible</p>
                </div>

                {/* Bouton d'accès au dashboard */}
                <button
                    className="landing-cta"
                    onClick={() => navigate('/dashboard')}
                >
                    Accéder au Dashboard Client
                    <span className="landing-arrow">→</span>
                </button>

                {/* Contact */}
                <div className="landing-contact">
                    <a href="mailto:contact@robinmasini.com">contact@robinmasini.com</a>
                </div>
            </div>

            {/* Background effect */}
            <div className="landing-bg-gradient"></div>
        </div>
    )
}
