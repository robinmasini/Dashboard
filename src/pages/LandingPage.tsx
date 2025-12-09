import { useNavigate } from 'react-router-dom'
import heroCard from '../assets/hero-card.png'
import logo from '../assets/logo-ds.png'
import './LandingPage.css'

/**
 * Landing Page pour robinmasini.com
 * Affiche la carte de présentation avec accès au dashboard
 */
export default function LandingPage() {
    const navigate = useNavigate()

    return (
        <div className="landing-page">
            {/* Section haute avec fond noir */}
            <div className="landing-hero">
                <img src={heroCard} alt="Robin Masini - Concepteur Product UX/UI Design, IA Développeur Full Stack JavaScript" className="landing-hero-card" />
            </div>

            {/* Section basse avec gradient */}
            <div className="landing-bottom">
                {/* Logo */}
                <img src={logo} alt="Robin Masini" className="landing-logo" />

                {/* Message temporaire */}
                <div className="landing-message">
                    <span className="landing-badge">En construction</span>
                    <p>Site vitrine bientôt disponible</p>
                </div>

                {/* Bouton d'accès au dashboard */}
                <button
                    className="landing-cta"
                    onClick={() => navigate('/auth/client')}
                >
                    Accéder au Dashboard Client
                    <span className="landing-arrow">→</span>
                </button>

                {/* Contact */}
                <div className="landing-contact">
                    <a href="mailto:contact@robinmasini.com">contact@robinmasini.com</a>
                    <p className="landing-address">520 Rue Frédéric Joliot - 13100 Aix-en-Provence</p>
                </div>
            </div>

            {/* Background gradient effect - positioned lower */}
            <div className="landing-bg-gradient"></div>
        </div>
    )
}
