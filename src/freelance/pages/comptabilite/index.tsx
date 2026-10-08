import { useEffect, useMemo, useState } from 'react'
import { currentBalance } from '../../../data/dashboard'
import './Comptabilite.css'

// Coefficient appliqué au montant HT (part restante après prélèvements)
const DEFAULT_COEFFICIENT = 0.788
// Dernier solde relevé (cf. data/dashboard.ts > currentBalance)
const DEFAULT_SHINE_BALANCE = currentBalance.amount
const SHINE_BALANCE_STORAGE_KEY = 'rm_compta_shine_balance'
const PERSONAL_CHARGES_STORAGE_KEY = 'rm_compta_personal_charges'

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)

// Accepte "1 250,50", "1250.50", "1 250 €"...
const parseAmount = (raw: string): number => {
  const cleaned = raw.replace(/[\s €]/g, '').replace(',', '.')
  const value = parseFloat(cleaned)
  return isNaN(value) ? 0 : value
}

const DEFAULT_SHINE_BALANCE_TEXT = String(DEFAULT_SHINE_BALANCE).replace('.', ',')

// La valeur saisie n'est reprise que si elle a été faite sur le relevé actuel :
// un nouveau relevé dans data/dashboard.ts écrase les anciennes saisies.
const readStoredBalance = (): string => {
  try {
    const stored = JSON.parse(localStorage.getItem(SHINE_BALANCE_STORAGE_KEY) ?? 'null')
    return stored?.asOf === currentBalance.asOf ? stored.value : DEFAULT_SHINE_BALANCE_TEXT
  } catch {
    return DEFAULT_SHINE_BALANCE_TEXT
  }
}

type PersonalCharges = { enabled: boolean; amount: string }

const readStoredCharges = (): PersonalCharges => {
  try {
    const stored = JSON.parse(localStorage.getItem(PERSONAL_CHARGES_STORAGE_KEY) ?? 'null')
    if (stored && typeof stored.enabled === 'boolean' && typeof stored.amount === 'string') return stored
  } catch {
    // valeur absente ou illisible : on repart de zéro
  }
  return { enabled: false, amount: '' }
}

export default function Comptabilite() {
  const [amountHT, setAmountHT] = useState('')
  const [coefficient, setCoefficient] = useState(String(DEFAULT_COEFFICIENT).replace('.', ','))
  const [shineBalance, setShineBalance] = useState(readStoredBalance)
  const [personalCharges, setPersonalCharges] = useState(readStoredCharges)

  useEffect(() => {
    try {
      localStorage.setItem(SHINE_BALANCE_STORAGE_KEY, JSON.stringify({ value: shineBalance, asOf: currentBalance.asOf }))
    } catch {
      // stockage indisponible (navigation privée) : on garde la valeur en mémoire
    }
  }, [shineBalance])

  useEffect(() => {
    try {
      localStorage.setItem(PERSONAL_CHARGES_STORAGE_KEY, JSON.stringify(personalCharges))
    } catch {
      // stockage indisponible (navigation privée) : on garde la valeur en mémoire
    }
  }, [personalCharges])

  const { ht, net, retenue, balance, charges, balanceAfter } = useMemo(() => {
    const ht = parseAmount(amountHT)
    const coef = parseAmount(coefficient)
    const net = Math.round(ht * coef * 100) / 100
    const balance = parseAmount(shineBalance)
    const charges = personalCharges.enabled ? parseAmount(personalCharges.amount) : 0
    return {
      ht,
      net,
      retenue: Math.round((ht - net) * 100) / 100,
      balance,
      charges,
      balanceAfter: Math.round((balance + net - charges) * 100) / 100,
    }
  }, [amountHT, coefficient, shineBalance, personalCharges])

  return (
    <div className="workspace__content">
      <div className="section-header">
        <div className="section-header__tabs">
          <p className="section-header__label">Comptabilité</p>
          <div className="tab-group">
            <button className="tab-pill is-active">Calculateur</button>
          </div>
        </div>
      </div>

      <section className="compta-grid">
        {/* Saisie */}
        <article className="panel compta-panel">
          <p className="panel__label">Nouvelle transaction</p>
          <p className="panel__sub">Saisis le montant HT pour simuler ton solde après encaissement.</p>

          <div className="compta-form">
            <label className="modal-field">
              <span>Montant HT (€)</span>
              <input
                type="text"
                inputMode="decimal"
                value={amountHT}
                placeholder="ex : 1 500"
                autoFocus
                onChange={(e) => setAmountHT(e.target.value)}
              />
            </label>

            <div className="compta-form__row">
              <label className="modal-field">
                <span>Coefficient</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={coefficient}
                  onChange={(e) => setCoefficient(e.target.value)}
                />
              </label>
              <label className="modal-field">
                <span>Solde actuel (€)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={shineBalance}
                  onChange={(e) => setShineBalance(e.target.value)}
                />
              </label>
            </div>

            <div className="compta-charges">
              <label className="compta-charges__toggle">
                <input
                  type="checkbox"
                  checked={personalCharges.enabled}
                  onChange={(e) => setPersonalCharges((prev) => ({ ...prev, enabled: e.target.checked }))}
                />
                <span>Charges compte Personnel</span>
              </label>
              <label className="modal-field">
                <span>Montant des charges (€)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={personalCharges.amount}
                  placeholder="ex : 1 200"
                  disabled={!personalCharges.enabled}
                  onChange={(e) => setPersonalCharges((prev) => ({ ...prev, amount: e.target.value }))}
                />
              </label>
            </div>

            {amountHT && (
              <button type="button" className="ghost-button compta-reset" onClick={() => setAmountHT('')}>
                Effacer le montant
              </button>
            )}
          </div>
        </article>

        {/* Résultat */}
        <article className="panel compta-panel compta-result">
          <p className="panel__label">Résultat</p>

          <dl className="compta-lines">
            <div>
              <dt>Montant HT</dt>
              <dd>{formatCurrency(ht)}</dd>
            </div>
            <div>
              <dt>× {coefficient || '0'}</dt>
              <dd className="is-positive">{formatCurrency(net)}</dd>
            </div>
            <div className="is-muted">
              <dt>Retenue</dt>
              <dd>− {formatCurrency(retenue)}</dd>
            </div>
            <div className="compta-lines__sep">
              <dt>Solde actuel</dt>
              <dd>{formatCurrency(balance)}</dd>
            </div>
            <div>
              <dt>+ Résultat du calcul</dt>
              <dd className="is-positive">+ {formatCurrency(net)}</dd>
            </div>
            {personalCharges.enabled && (
              <div>
                <dt>− Charges compte Personnel</dt>
                <dd className="is-negative">− {formatCurrency(charges)}</dd>
              </div>
            )}
          </dl>

          <div className="compta-total">
            <p>Solde après transaction</p>
            <strong>{formatCurrency(balanceAfter)}</strong>
          </div>
        </article>
      </section>
    </div>
  )
}
