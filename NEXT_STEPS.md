# Prochaines Étapes - Dashboard Unifié

## ✅ Ce qui a été fait

### Phase 1-5 : Infrastructure complète ✓
- ✅ Schéma Supabase complet avec toutes les tables + RLS + indexes
- ✅ Authentification refactorisée avec session réelle + roles
- ✅ 10 hooks Supabase complets avec CRUD + Realtime
- ✅ Fusion des deux apps en une seule avec routing conditionnel
- ✅ Code partagé extrait vers `/src/shared/`
- ✅ Pages Client migrées vers Supabase (5 pages)
- ✅ Pages Freelance créées (Commandes, Planning, Clients)
- ✅ Documentation complète (README, seed script, status)
- ✅ Package.json renommé en `dashboard-unified`
- ✅ Ancien dossier Dashboard Client supprimé

## 🚧 Ce qui reste à faire (optionnel)

### Pages Freelance supplémentaires

#### 1. Page Performance (non critique)
**Fichier**: `/src/freelance/pages/Performance.tsx`
**Composants à utiliser**:
- `PerformanceOverview.tsx`
- `FloatingStats.tsx`
- `ForecastPanel.tsx`
- `SustainabilityPanel.tsx`

**Implémentation suggérée**:
```typescript
import { useTickets, useProposals, useInvoices } from '../../shared'
import PerformanceOverview from '../components/PerformanceOverview'
// etc...

export default function Performance() {
  const { tickets } = useTickets()
  const { proposals } = useProposals()
  const { invoices } = useInvoices()
  
  // Calculer KPIs
  const todayBenefit = 0 // À implémenter avec getDigitalRadicalzTJM()
  const newClients = clients.filter(/* this month */).length
  
  return (
    <div className="workspace__content">
      <FloatingStats stats={...} />
      <PerformanceOverview data={...} />
    </div>
  )
}
```

#### 2. Page Time Tracking (non critique)
**Fichier**: `/src/freelance/pages/TimeTracking.tsx`
**Composants à utiliser**:
- `TimeTrackingBoard.tsx`
- `TimeTrackingTable.tsx`
- `TimeEvolutionPanel.tsx`

**Implémentation suggérée**:
```typescript
import { useTimeEntries } from '../../shared'
import TimeTrackingBoard from '../components/TimeTrackingBoard'
// etc...

export default function TimeTracking() {
  const today = new Date().toISOString().split('T')[0]
  const { entries, addEntry, updateEntry, deleteEntry } = useTimeEntries(today)
  
  return (
    <div className="workspace__content">
      <TimeTrackingBoard entries={entries} onAdd={addEntry} />
      <TimeTrackingTable entries={entries} onEdit={updateEntry} onDelete={deleteEntry} />
    </div>
  )
}
```

### Améliorations possibles

#### ActionModal intégration
Les pages Freelance utilisent actuellement `console.log` et `prompt()` pour les actions CRUD.
Pour améliorer l'UX, intégrer le composant `ActionModal` existant:

```typescript
// Exemple dans Commandes.tsx
const [modalOpen, setModalOpen] = useState(false)
const [modalSchema, setModalSchema] = useState<ActionSchema | null>(null)

const handleAdd = () => {
  setModalSchema(actionSchemas['commandes:tickets'])
  setModalOpen(true)
}

const handleSubmit = async (values: Record<string, string>) => {
  await addTicket({...values})
  setModalOpen(false)
}

return (
  <>
    {/* ... */}
    <ActionModal
      open={modalOpen}
      schema={modalSchema}
      onClose={() => setModalOpen(false)}
      onSubmit={handleSubmit}
    />
  </>
)
```

#### Optimisations Realtime
Les hooks utilisent actuellement un polling toutes les 2 secondes dans `useCloudStorage`.
Ce polling peut être désactivé une fois que toutes les données passent par Supabase Realtime:

1. Supprimer `useCloudStorage` et `cloudStorage.ts` (legacy)
2. Supprimer le `setInterval` dans le hook
3. S'assurer que Realtime est activé pour toutes les tables dans Supabase Dashboard

#### Tests
Créer des tests pour:
- Hooks Supabase (mock Supabase client)
- Logique d'authentification
- Composants critiques (formulaires, modales)

## 🎯 Priorités immédiates

### 1. Setup Supabase (CRITIQUE)
1. Créer un projet Supabase
2. Exécuter `/supabase_schema.sql`
3. Créer les utilisateurs (1 admin freelance + 1 client test)
4. Insérer les seed data depuis `/scripts/seed-supabase.md`
5. Activer Realtime sur toutes les tables
6. Copier les credentials dans `.env`

### 2. Tester l'application
1. `npm install` dans `/dashboard-app`
2. `npm run dev`
3. Tester login client (code 1234)
4. Tester login freelance (email admin)
5. Vérifier que les données s'affichent
6. Tester CRUD (créer, modifier, supprimer)
7. Tester Realtime (deux onglets simultanés)

### 3. Ajustements post-tests
- Corriger les bugs découverts
- Ajuster les styles si nécessaire
- Améliorer les messages d'erreur
- Optimiser les performances

## 📋 Checklist de déploiement

Avant de déployer en production:

- [ ] Variables d'environnement configurées (Supabase URL + Key)
- [ ] Schéma Supabase déployé avec RLS
- [ ] Utilisateurs créés (freelance + clients)
- [ ] Seed data inséré
- [ ] Tests effectués sur toutes les pages
- [ ] CRUD testé sur toutes les entités
- [ ] Realtime testé
- [ ] Performance vérifiée
- [ ] Build production testé (`npm run build && npm run preview`)
- [ ] Documentation à jour

## 🔒 Sécurité

### Points de vigilance
- Les codes d'accès clients sont à 4 chiffres (faible sécurité)
  - Pour renforcer: passer à 6-8 chiffres ou ajouter une expiration
- Les passwords Supabase doivent être forts pour le freelance admin
- Les politiques RLS sont critiques : bien tester qu'un client ne voit QUE ses données

### Recommandations
1. Activer 2FA pour le compte admin Supabase
2. Utiliser des secrets pour VITE_ADMIN_EMAIL (ne pas commit dans git)
3. Mettre en place un rate limiting sur les endpoints d'auth
4. Logger les tentatives de connexion échouées

## 📚 Ressources

- Schema Supabase: `/supabase_schema.sql`
- Seed data: `/scripts/seed-supabase.md`
- Documentation: `/README.md`
- État d'implémentation: `/IMPLEMENTATION_STATUS.md`
- Code partagé: `/src/shared/`
- Hooks Supabase: `/src/shared/hooks/useSupabaseHooks.ts`

## 🤝 Support

Pour toute question ou bug:
1. Vérifier `/IMPLEMENTATION_STATUS.md` pour voir ce qui est fait
2. Lire `/README.md` section Troubleshooting
3. Vérifier les logs console (erreurs Supabase, RLS, etc.)
4. Tester les requêtes directement dans Supabase SQL Editor

Bon courage pour la suite ! 🚀

