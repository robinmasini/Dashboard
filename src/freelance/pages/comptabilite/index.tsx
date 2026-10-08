import { useEffect, useMemo, useState } from 'react'
import './Comptabilite.css'

// Coefficient appliqué au montant HT (part restante après prélèvements)
const DEFAULT_COEFFICIENT = 0.788
// Dernier solde Shine connu (cf. data/dashboard.ts > walletSummary)
const DEFAULT_SHINE_BALANCE = 8094.76
const SHINE_BALANCE_STORAGE_KEY = 'rm_compta_shine_balance'

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)

// Accepte "1 250,50", "1250.50", "1 250 €"...
const parseAmount = (raw: string): number => {
  const cleaned = raw.replace(/[\s €]/g, '').replace(',', '.')
  const value = parseFloat(cleaned)
  return isNaN(value) ? 0 : value
}

const readStoredBalance = (): string => {
  try {
    return localStorage.getItem(SHINE_BALANCE_STORAGE_KEY) ?? String(DEFAULT_SHINE_BALANCE).replace('.', ',')
  } catch {
    return String(DEFAULT_SHINE_BALANCE).replace('.', ',')
  }
}

export default function Comptabilite() {
  const [amountHT, setAmountHT] = useState('')
  const [coefficient, setCoefficient] = useState(String(DEFAULT_COEFFICIENT).replace('.', ','))
  const [shineBalance, setShineBalance] = useState(readStoredBalance)

  useEffect(() => {
    try {
      localStorage.setItem(SHINE_BALANCE_STORAGE_KEY, shineBalance)
    } catch {
      // stockage indisponible (navigation privée) : on garde la valeur en mémoire
    }
  }, [shineBalance])

  const { ht, net, retenue, balance, balanceAfter } = useMemo(() => {
    const ht = parseAmount(amountHT)
    const coef = parseAmount(coefficient)
    const net = Math.round(ht * coef * 100) / 100
    const balance = parseAmount(shineBalance)
    return {
      ht,
      net,
      retenue: Math.round((ht - net) * 100) / 100,
      balance,
      balanceAfter: Math.round((balance + net) * 100) / 100,
    }
  }, [amountHT, coefficient, shineBalance])

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
                <span>Solde actuel Shine (€)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={shineBalance}
                  onChange={(e) => setShineBalance(e.target.value)}
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
              <dt>Solde actuel Shine</dt>
              <dd>{formatCurrency(balance)}</dd>
            </div>
            <div>
              <dt>+ Résultat du calcul</dt>
              <dd className="is-positive">+ {formatCurrency(net)}</dd>
            </div>
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
