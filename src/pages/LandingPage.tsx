import { useState } from 'react'
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
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    const companies = [
        { name: 'Meonix', logo: group3709Logo },
        { name: 'Christophe Desouches', logo: christopheLogo, scale: 1.7 },
        { name: 'Kuerkod', logo: image169Logo },
        { name: 'Foundclub', logo: foundclubLogo, scale: 0.55 },
        { name: 'Zol', logo: group3708Logo, scale: 1.3 },
        { name: 'SuperMama', logo: supermamaLogo },
        { name: 'Casper Dental', logo: group3710Logo, scale: 1.35 }
    ]

    return (
        <div className="landing-page">
            {/* Section haute avec fond noir */}
            <div className="landing-hero">
                <h1 className="visually-hidden">Robin Masini — Product Concepteur, UX/UI Designer & Full Stack Developer</h1>
                
                {/* En-tête avec hamburger à gauche et logo à droite (alignés sur la hero card) */}
                <header className="landing-header">
                    <button 
                        className="landing-hamburger" 
                        onClick={() => setIsMenuOpen(true)}
                        aria-label="Ouvrir le menu"
                    >
                        <span className="landing-hamburger-line"></span>
                        <span className="landing-hamburger-line"></span>
                        <span className="landing-hamburger-line"></span>
                    </button>
                    <img src={logo} alt="Robin Masini" className="landing-logo" />
                </header>

                <img src={heroCard} alt="Robin Masini - Product Concepteur, UX/UI Designer & Full Stack Developer" className="landing-hero-card" />
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

            {/* Contact à la fin de la page */}
            <div className="landing-contact">
                <a href="mailto:contact@robinmasini.com">contact@robinmasini.com</a>
                <a href="tel:+33603096001" className="landing-phone">+33 6 03 09 60 01</a>
                <p className="landing-address">520 Rue Frédéric Joliot - 13100 Aix-en-Provence</p>
            </div>

            {/* Background gradient effect - positioned lower */}
            <div className="landing-bg-gradient"></div>

            {/* Volet de navigation (Drawer) pour le menu hamburger */}
            <div className={`landing-drawer ${isMenuOpen ? 'is-open' : ''}`} onClick={() => setIsMenuOpen(false)}>
                <div className="landing-drawer-content" onClick={(e) => e.stopPropagation()}>
                    <button className="landing-drawer-close" onClick={() => setIsMenuOpen(false)} aria-label="Fermer le menu">
                        ✕
                    </button>
                    
                    <nav className="landing-drawer-nav">
                        <a href="/" className="landing-drawer-link" onClick={() => setIsMenuOpen(false)}>
                            Accueil
                        </a>
                        <button className="landing-drawer-link" onClick={() => { setIsMenuOpen(false); navigate('/auth/client'); }}>
                            Dashboard Client
                        </button>
                        <button className="landing-drawer-link" onClick={() => { setIsMenuOpen(false); navigate('/auth/freelance'); }}>
                            Accès Admin
                        </button>
                        <a href="mailto:contact@robinmasini.com?subject=Prise de contact" className="landing-drawer-link" onClick={() => setIsMenuOpen(false)}>
                            Me contacter
                        </a>
                    </nav>

                    <div className="landing-drawer-footer">
                        <p>© Robin Masini</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

