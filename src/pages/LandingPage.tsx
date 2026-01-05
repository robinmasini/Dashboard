import { useNavigate } from 'react-router-dom'
import heroCard from '../assets/hero-card.png'
import logo from '../assets/logo-ds.png'
import iphoneMockup from '../assets/iphone-mockup.png'
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
                {/* Logo au-dessus */}
                <img src={logo} alt="Robin Masini" className="landing-logo" />
                <img src={heroCard} alt="Robin Masini - Concepteur Product UX/UI Design, IA Développeur Full Stack JavaScript" className="landing-hero-card" />
            </div>

            {/* Section basse avec gradient */}
            <div className="landing-bottom">

                {/* Message */}
                <div className="landing-message">
                    <p>Je réalise des <strong>applications mobiles</strong> et des <strong>sites web clés en main, sur mesure</strong>, pour une expérience fluide sur <strong>tous les écrans</strong> !</p>
                </div>

                {/* CTAs on same row */}
                <div className="landing-cta-row">
                    <a
                        href="mailto:contact@robinmasini.com?subject=Demande de devis"
                        className="landing-cta"
                    >
                        Intéressé ?
                        <span className="landing-arrow">→</span>
                    </a>

                    <button
                        className="landing-cta landing-cta-secondary"
                        onClick={() => navigate('/auth/client')}
                    >
                        Dashboard Client
                        <span className="landing-arrow">→</span>
                    </button>
                </div>

                {/* Contact */}
                <div className="landing-contact">
                    <a href="mailto:contact@robinmasini.com">contact@robinmasini.com</a>
                    <a href="tel:+33603096001" className="landing-phone">+33 6 03 09 60 01</a>
                    <p className="landing-address">520 Rue Frédéric Joliot - 13100 Aix-en-Provence</p>
                </div>
            </div>

            {/* iPhone Mockup - en bas de page */}
            <div className="landing-mockup">
                <img src={iphoneMockup} alt="App Mobile Mockup" className="landing-mockup-img" />
            </div>

            {/* Background gradient effect - positioned lower */}
            <div className="landing-bg-gradient"></div>
        </div>
    )
}
