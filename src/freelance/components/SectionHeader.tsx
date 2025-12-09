import type { SectionTab } from '../../data/dashboard'

type SectionHeaderProps = {
  sectionLabel: string
  tabs: SectionTab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  ctaLabel: string
  onPrimaryAction?: () => void
}

const SectionHeader = ({
  sectionLabel,
  tabs,
  activeTab,
  onTabChange,
  ctaLabel,
  onPrimaryAction,
}: SectionHeaderProps) => (
  <header className="section-header">
    <div className="section-header__tabs">
      <p className="section-header__label">{sectionLabel}</p>
      <div className="tab-group">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              type="button"
              className={[
                'tab-pill',
                isActive ? 'is-active' : '',
                tab.status === 'soon' ? 'is-soon' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onTabChange(tab.id)}
            >
              <span>{tab.label}</span>
              {tab.status === 'soon' && <span className="tab-pill__soon">Bientôt</span>}
            </button>
          )
        })}
      </div>
    </div>
    <div className="section-header__actions">
      <button type="button" className="ghost-button" aria-label="Rechercher">
        <span className="icon-search" />
      </button>
      <button type="button" className="primary-button" onClick={onPrimaryAction}>
        {ctaLabel}
        <span className="primary-button__addon">+</span>
      </button>
    </div>
  </header>
)

export default SectionHeader


