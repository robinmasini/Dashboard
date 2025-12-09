# État d'implémentation de la refonte Dashboard

Date: 24 novembre 2025

## ✅ PHASES COMPLÉTÉES

### Phase 1: Architecture et sécurité Supabase ✅
- ✅ Schéma Supabase complété avec toutes les tables (proposals, projects, messages, documents, etc.)
- ✅ Type `tickets.price` corrigé en `DECIMAL(10,2)` (euros, pas centimes)
- ✅ Colonne `order_index` ajoutée à `todo_items` pour le tri
- ✅ Politiques RLS complètes implémentées pour toutes les tables
- ✅ Fonctions helper SQL créées (`is_freelance_admin()`, `get_client_id_for_user()`)
- ✅ Index de performance ajoutés

### Phase 2: Authentification refactorisée ✅
- ✅ Fichier `/src/shared/utils/roles.ts` créé avec enum `UserRole`
- ✅ Fonction `getUserRole()` basée sur `user_metadata.role` ou email
- ✅ Fichier `/src/shared/utils/auth.ts` refactorisé:
  - `isAuthenticated()` utilise maintenant `supabase.auth.getSession()`
  - `verifyAuthCode()` pour clients avec metadata role
  - `loginFreelance()` pour connexion admin
  - `setupAuthListener()` pour synchronisation globale
- ✅ Page `/src/client/pages/auth/FreelanceLogin.tsx` créée

### Phase 3: Hooks Supabase complets ✅
- ✅ Fichier `/src/shared/hooks/useSupabaseHooks.ts` créé (~600 lignes)
- ✅ Hooks implémentés avec CRUD + realtime pour:
  - `useTickets(clientId?)`
  - `useProposals(clientId?)`
  - `useInvoices(clientId?)`
  - `useProjects(clientId?)`
  - `useMessages(clientId)`
  - `useDocuments(clientId)`
  - `useAgendaEvents()`
  - `useTodoItems()`
  - `useTimeEntries(date?)`
  - `useClients()`

### Phase 4: Fusion des applications ✅
- ✅ Dossier `Dashboard Freelance EI RM` renommé en `dashboard-app`
- ✅ Structure créée:
  ```
  /src
    /shared (code commun)
    /freelance (pages/composants freelance)
    /client (pages/composants client)
  ```
- ✅ Fichiers déplacés vers `/src/shared`:
  - `services/supabaseClient.ts`
  - `utils/auth.ts`, `utils/roles.ts`
  - `hooks/useSupabaseHooks.ts`, `hooks/useCloudStorage.ts`
  - `services/cloudStorage.ts`, `services/cloudStorageMock.ts`
  - `components/RobinLogo.tsx`, `components/SectionTabs.tsx`, `components/Sidebar.css`
  - `types/dashboard.ts`
- ✅ Export centralisé `/src/shared/index.ts` créé
- ✅ `App.tsx` refactorisé avec routing conditionnel basé sur `UserRole`
- ✅ `DashboardLayout.tsx` refactorisé avec navigation adaptative selon le rôle

### Phase 5: Pages Client migrées vers Supabase ✅
- ✅ Pages copiées depuis Dashboard Client vers `/src/client/pages/`
- ✅ `/src/client/pages/votre-projet/index.tsx` : utilise `useProjects`, `useTickets`, `useProposals`, `useMessages`, `useDocuments`
- ✅ `/src/client/pages/commandes/tickets.tsx` : utilise `useTickets` + suppression division par 100 du prix
- ✅ `/src/client/pages/commandes/devis.tsx` : utilise `useProposals`
- ✅ `/src/client/pages/commandes/facturation.tsx` : utilise `useInvoices`
- ✅ `/src/client/pages/planning/todo.tsx` : utilise `useTodoItems` en lecture seule
- ✅ Composant `TicketRequestModal` copié vers `/src/client/components/`
- ✅ Tous les imports mis à jour pour utiliser les chemins `/shared/`

## 🚧 PHASES EN ATTENTE

### Phase 6: Pages Freelance (À CRÉER)

#### 6.1 Performance Page
**Fichier**: `/src/freelance/pages/Performance.tsx`
**Dépendances**: 
- Composants existants à réutiliser/adapter:
  - `FloatingStats.tsx`
  - `PerformanceOverview.tsx`
  - `ForecastPanel.tsx`
  - `SustainabilityPanel.tsx`
- Utilise: `navConfig.performance` depuis `/src/data/dashboard.ts`
- Hooks: `useProposals()`, `useInvoices()`, `useTickets()`

#### 6.2 Commandes Freelance Page
**Fichier**: `/src/freelance/pages/Commandes.tsx`
**Dépendances**:
  - `TicketsTable.tsx` (existe)
  - `ProposalsList.tsx` (existe)
  - `InvoicingPanel.tsx` (existe)
  - `ActionModal.tsx` (existe)
- Hooks: `useTickets()`, `useProposals()`, `useInvoices()` (sans filtre clientId)
- CRUD complet : ajouter, modifier, supprimer

#### 6.3 Planning Freelance Page
**Fichier**: `/src/freelance/pages/Planning.tsx`
**Dépendances**:
  - `TodoColumns.tsx` (existe, avec drag & drop)
  - `AgendaCalendar.tsx` (existe)
  - `ActionModal.tsx` (existe)
- Hooks: `useTodoItems()`, `useAgendaEvents()`
- Actions: `onAddCard`, `onEdit`, `onMoveCard`, `onDeleteCard`

#### 6.4 Time Tracking Freelance Page
**Fichier**: `/src/freelance/pages/TimeTracking.tsx`
**Dépendances**:
  - `TimeTrackingBoard.tsx` (existe)
  - `TimeTrackingTable.tsx` (existe)
  - `TimeEvolutionPanel.tsx` (existe)
- Hooks: `useTimeEntries()`
- Utils: `getDigitalRadicalzTJM()` depuis `/src/utils/tjm.ts`

#### 6.5 Clients Freelance Page
**Fichier**: `/src/freelance/pages/Clients.tsx`
**Dépendances**:
  - `ClientsBoard.tsx` (existe)
  - `ActionModal.tsx` (existe)
- Hooks: `useClients()`
- CRUD complet pour gérer les clients

### Phase 7: Configuration et nettoyage

#### 7.1 Variables d'environnement
- [ ] Créer `/dashboard-app/.env.example`
- [ ] Ajouter validation stricte dans `supabaseClient.ts`
- [ ] Supprimer les placeholders

#### 7.2 Nettoyage code
- [ ] Supprimer `/Dashboard Client/` (ancien dossier)
- [ ] Supprimer code mort: `utils/age.ts`, si non utilisé
- [ ] Supprimer anciens dossiers: `/src/pages/`, `/src/components/` (obsolètes)
- [ ] Vérifier imports cassés
- [ ] Supprimer `useCloudStorage` si plus utilisé (garder temporairement)

#### 7.3 Documentation
- [ ] Créer `/dashboard-app/README.md` complet
- [ ] Documenter setup Supabase (schema + RLS + seed)
- [ ] Documenter variables d'environnement
- [ ] Documenter login freelance vs client
- [ ] Mettre à jour `/dashboard-app/START.md`

#### 7.4 Script seed Supabase
- [ ] Créer `/dashboard-app/scripts/seed-supabase.ts`
- [ ] Insérer client "Digital Radicalz" avec code 1234
- [ ] Insérer tickets, devis, factures, todos exemples

## FICHIERS IMPORTANTS CRÉÉS/MODIFIÉS

### Nouveaux fichiers
- `/dashboard-app/supabase_schema.sql` (complété avec RLS)
- `/dashboard-app/src/shared/utils/roles.ts`
- `/dashboard-app/src/shared/utils/auth.ts` (refactorisé)
- `/dashboard-app/src/shared/hooks/useSupabaseHooks.ts` (~600 lignes)
- `/dashboard-app/src/shared/index.ts` (exports centralisés)
- `/dashboard-app/src/client/pages/auth/FreelanceLogin.tsx`
- `/dashboard-app/src/client/pages/votre-projet/index.tsx` (migré Supabase)
- `/dashboard-app/src/client/pages/commandes/*.tsx` (migrés Supabase)
- `/dashboard-app/src/client/pages/planning/todo.tsx` (migré Supabase)

### Fichiers modifiés
- `/dashboard-app/src/App.tsx` (routing conditionnel par rôle)
- `/dashboard-app/src/layouts/DashboardLayout.tsx` (navigation adaptative)
- `/dashboard-app/src/client/pages/auth/CodeEntry.tsx` (imports mis à jour)

## PROCHAINES ÉTAPES PRIORITAIRES

1. **Créer les 5 pages Freelance** en utilisant les composants existants
2. **Tester l'authentification** (freelance et client)
3. **Configurer Supabase** (déployer le schema, créer les utilisateurs)
4. **Seed data** pour les tests
5. **Nettoyer** le code mort et l'ancien dossier Dashboard Client
6. **Documenter** le setup complet

## NOTES TECHNIQUES

- Les hooks Supabase appliquent automatiquement les filtres RLS
- Le client Supabase utilise la session Auth pour les politiques
- Les metadata `role: 'freelance' | 'client'` déterminent les permissions
- CloudStorage est conservé temporairement comme fallback legacy
- Prix des tickets maintenant en `DECIMAL(10,2)` (euros directs, pas centimes)

## COMPOSANTS EXISTANTS À RÉUTILISER

Déjà présents dans `/dashboard-app/src/components/`:
- ActionModal.tsx
- AgendaCalendar.tsx
- ClientsBoard.tsx
- FloatingStats.tsx
- ForecastPanel.tsx
- InvoicingPanel.tsx
- PerformanceOverview.tsx
- ProposalsList.tsx
- SoonPanel.tsx
- SustainabilityPanel.tsx
- TicketsTable.tsx
- TimeEvolutionPanel.tsx
- TimeTrackingBoard.tsx
- TimeTrackingTable.tsx
- TodoColumns.tsx

Ces composants doivent être déplacés vers `/src/freelance/components/` et adaptés pour utiliser les nouveaux hooks.

