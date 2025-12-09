# Dashboard Unifié - Freelance & Client

Application dashboard unifiée avec routing conditionnel selon le rôle utilisateur (Freelance admin ou Client).

## 🏗️ Architecture

### Structure du projet

```
/dashboard-app
  /src
    /shared                 # Code partagé entre freelance et client
      /components          # Composants réutilisables
      /hooks               # Hooks Supabase et Cloud Storage
      /services            # Services (Supabase, Cloud Storage)
      /types               # Types TypeScript
      /utils               # Utilitaires (auth, roles)
    /freelance            # Pages et composants spécifiques au freelance
      /components
      /pages
    /client               # Pages et composants spécifiques au client
      /components
      /pages
    /layouts              # Layouts (DashboardLayout adaptatif)
    App.tsx               # Routing conditionnel par rôle
    main.tsx
```

### Technologies

- **Frontend**: React 19, TypeScript, Vite
- **Backend**: Supabase (Auth + Database + Realtime)
- **Routing**: React Router v6
- **État**: Hooks personnalisés + Supabase Realtime

## 🔐 Authentification

### Deux modes de connexion

1. **Freelance Admin**: `/auth/freelance`
   - Connexion email/password classique
   - Metadata `role: 'freelance'` dans Supabase Auth
   - Accès complet à toutes les données

2. **Client**: `/auth/client`
   - Connexion par code à 4 chiffres
   - Email virtuel: `{code}@dashboard.local`
   - Metadata `role: 'client'`
   - Accès restreint par RLS à ses propres données

### Configuration

Les roles sont gérés via `user_metadata` dans Supabase Auth:
- `role: 'freelance'` → accès admin complet
- `role: 'client'` → accès filtré par `client_id`

## 🗄️ Base de données Supabase

### Tables

- `clients`: Informations clients avec access_code unique
- `tickets`: Tickets/demandes (liés aux clients)
- `proposals`: Devis (liés aux clients)
- `invoices`: Factures (liées aux clients)
- `projects`: Projets (liés aux clients)
- `messages`: Messages (liés aux clients)
- `documents`: Documents (liés aux clients)
- `todo_items`: Tâches du planning (partagées)
- `agenda_events`: Événements d'agenda
- `time_entries`: Entrées de time tracking (privées au freelance)

### Row Level Security (RLS)

Toutes les tables ont RLS activé avec politiques:
- **Freelance**: accès complet (identifié par `is_freelance_admin()`)
- **Client**: lecture seule de ses données (filtrage par `client_id`)
- **Exceptions**: 
  - Tickets: clients peuvent créer et mettre à jour (status uniquement)
  - Messages: clients peuvent marquer comme lus

### Setup Supabase

1. Créer un projet Supabase
2. Exécuter le schema SQL: `/dashboard-app/supabase_schema.sql`
3. Créer un utilisateur admin avec email/password
4. Mettre à jour les metadata: `{ "role": "freelance" }`
5. Pour chaque client: créer un utilisateur avec email `{code}@dashboard.local` et password = code

## 📦 Installation

```bash
cd dashboard-app
npm install
```

### Variables d'environnement

Créer un fichier `.env` :

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_ADMIN_EMAIL=admin@example.com
```

## 🚀 Démarrage

```bash
# Développement
npm run dev

# Build production
npm run build

# Preview build
npm run preview
```

## 🔑 Création d'un client

### Côté Supabase

1. Insérer dans la table `clients`:
```sql
INSERT INTO clients (name, access_code, status)
VALUES ('Mon Client', '1234', 'En cours');
```

2. Créer un utilisateur Auth:
```sql
-- Via Supabase dashboard ou API
Email: 1234@dashboard.local
Password: 1234
Metadata: { "role": "client" }
```

3. Lier l'utilisateur au client:
```sql
UPDATE clients 
SET auth_user_id = 'auth-user-uuid'
WHERE access_code = '1234';
```

### Côté App Freelance

Utiliser la page `/dashboard/clients` pour:
- Créer un client (génère automatiquement un code à 4 chiffres)
- Fournir le code au client pour qu'il se connecte

## 📱 Pages Disponibles

### Pages Client

- `/dashboard/projet`: Vue d'ensemble du projet (avancement, actualités, messages, documents)
- `/dashboard/commandes/tickets`: Liste des tickets, création de demandes
- `/dashboard/commandes/devis`: Liste des devis
- `/dashboard/commandes/facturation`: Liste des factures
- `/dashboard/planning`: To-do list en lecture seule

### Pages Freelance

- `/dashboard/commandes`: Gestion complète tickets/devis/factures avec CRUD
- `/dashboard/planning`: To-do list interactive avec drag & drop
- `/dashboard/clients`: Gestion des clients (création, modification, suppression)
- `/dashboard/performance`: (À implémenter - dashboards de performance)
- `/dashboard/time-tracking`: (À implémenter - suivi du temps)

## 🔧 Hooks Supabase

Tous les hooks sont dans `/src/shared/hooks/useSupabaseHooks.ts`:

```typescript
// Exemples d'utilisation
const { tickets, addTicket, updateTicket, deleteTicket } = useTickets(clientId?)
const { proposals, addProposal, updateProposal } = useProposals(clientId?)
const { clients, addClient, updateClient } = useClients()
const { items: todos, addItem, moveItem } = useTodoItems()
```

Tous les hooks:
- Chargent les données au montage
- S'abonnent aux changements Realtime
- Retournent `loading` et `error`
- Appliquent automatiquement les filtres RLS

## 📝 Scripts Utiles

```bash
# Linter
npm run lint

# Type checking
npm run build

# Démarrer avec logs
npm run dev > dev.log 2>&1
```

## 🐛 Troubleshooting

### Erreur "Supabase URL missing"

Vérifier que `.env` contient bien `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.

### Utilisateur ne peut pas se connecter

1. Vérifier que l'utilisateur existe dans Supabase Auth
2. Vérifier que `user_metadata.role` est défini
3. Pour les clients, vérifier que `auth_user_id` est bien lié dans la table `clients`

### RLS bloque les requêtes

1. Vérifier que les politiques RLS sont déployées
2. Vérifier que les fonctions `is_freelance_admin()` et `get_client_id_for_user()` existent
3. Tester les requêtes dans le SQL Editor Supabase

### Realtime ne fonctionne pas

1. Activer Realtime dans Supabase Dashboard pour chaque table
2. Vérifier que les channels sont bien souscrits
3. Vérifier les filtres dans les souscriptions

## 📚 Documentation Additionnelle

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)
- [React Router v6](https://reactrouter.com/en/main)

## 🤝 Contribution

Ce projet est en développement actif. Les pages Performance et Time Tracking sont à implémenter.

## 📄 Licence

Propriétaire - Robin MASINI
