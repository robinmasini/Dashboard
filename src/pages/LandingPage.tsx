import { useNavigate } from 'react-router-dom'
import heroCard from '../assets/hero-card.png'
import logo from '../assets/logo-ds.png'
import './LandingPage.css'

// Imports des logos partenaires
import foundclubLogo from '../assets/FOUNDCLUB.png'
import group3708Logo from '../assets/Group 1000003708.png'
import group3709Logo from '../assets/Group 1000003709.png'
import group3710Logo from '../assets/Group 1000003710.png'
import supermamaLogo from '../assets/Logo iOS + Horizontal SuperMama 5.png'
import christopheLogo from '../assets/christophe-signature 1.png'
import image169Logo from '../assets/image 169.png'

/**
 * Landing Page pour robinmasini.com
 * Affiche la carte de présentation avec accès au dashboard
 */
export default function LandingPage() {
    const navigate = useNavigate()

    const companies = [
        { name: 'Kuerkod', logo: image169Logo },
        { name: 'Meonix', logo: group3709Logo },
        { name: 'Foundclub', logo: foundclubLogo, scale: 0.7 },
        { name: 'Christophe Desouches', logo: christopheLogo, scale: 1.5 },
        { name: 'Zol', logo: group3708Logo, scale: 1.3 },
        { name: 'SuperMama', logo: supermamaLogo },
        { name: 'Casper Dental', logo: group3710Logo, scale: 1.35 }
    ]

    return (
        <div className="landing-page">
            {/* Section haute avec fond noir */}
            <div className="landing-hero">
                {/* Logo au-dessus */}
                <img src={logo} alt="Robin Masini" className="landing-logo" />
                <img src={heroCard} alt="Robin Masini - Concepteur Product UX/UI Design, Développeur Full Stack JavaScript" className="landing-hero-card" />
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

            {/* Carrousel infini des logos partenaires en bas de page */}
            <div className="landing-carousel-section">
                <p className="landing-carousel-title">Ils me font confiance</p>
                <div className="landing-carousel-wrapper">
                    <div className="landing-carousel-track">
                        {/* Premier set de logos */}
                        {companies.map((company, index) => (
                            <div key={`logo-1-${index}`} className="landing-carousel-item">
                                <img
                                    src={company.logo}
                                    alt={company.name}
                                    className="landing-carousel-img"
                                    style={company.scale ? { height: `calc(var(--logo-height) * ${company.scale})` } : undefined}
                                />
                            </div>
                        ))}
                        {/* Deuxième set dupliqué pour assurer la continuité du défilement */}
                        {companies.map((company, index) => (
                            <div key={`logo-2-${index}`} className="landing-carousel-item">
                                <img
                                    src={company.logo}
                                    alt={company.name}
                                    className="landing-carousel-img"
                                    style={company.scale ? { height: `calc(var(--logo-height) * ${company.scale})` } : undefined}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Background gradient effect - positioned lower */}
            <div className="landing-bg-gradient"></div>
        </div>
    )
}

