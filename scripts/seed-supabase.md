# Seed Data pour Supabase

Ce document contient les données de seed à insérer manuellement dans Supabase après avoir déployé le schema.

## 1. Créer un client de démonstration

```sql
-- Insérer le client "Digital Radicalz"
INSERT INTO clients (name, contact_name, industry, access_code, status, email)
VALUES (
  'Digital Radicalz',
  'Contact Digital Radicalz',
  'Digital',
  '1234',
  'En cours',
  'contact@digitalradicalz.com'
);

-- Récupérer l'ID du client créé
-- Notez cet ID pour l'utiliser dans les requêtes suivantes
SELECT id FROM clients WHERE access_code = '1234';
```

## 2. Créer l'utilisateur Auth pour le client

Dans le Supabase Dashboard > Authentication > Users:

1. Cliquer sur "Add user"
2. Email: `1234@dashboard.local`
3. Password: `1234`
4. Confirm password: `1234`
5. Cliquer sur "Create user"
6. Une fois créé, éditer l'utilisateur et ajouter dans "User Metadata":
```json
{
  "role": "client"
}
```

## 3. Lier l'utilisateur Auth au client

```sql
-- Remplacer {auth_user_id} par l'ID de l'utilisateur Auth créé
-- Remplacer {client_id} par l'ID du client Digital Radicalz
UPDATE clients 
SET auth_user_id = '{auth_user_id}'
WHERE id = '{client_id}';
```

## 4. Créer l'utilisateur Admin Freelance

Dans le Supabase Dashboard > Authentication > Users:

1. Cliquer sur "Add user"
2. Email: `admin@example.com` (ou votre email)
3. Password: votre mot de passe sécurisé
4. Confirm password
5. Cliquer sur "Create user"
6. Une fois créé, éditer l'utilisateur et ajouter dans "User Metadata":
```json
{
  "role": "freelance"
}
```

## 5. Insérer des tickets de démonstration

```sql
-- Remplacer {client_id} par l'ID du client Digital Radicalz
INSERT INTO tickets (client_id, title, description, type, status, price, eta, source)
VALUES 
(
  '{client_id}',
  'Conception UX/UI & Site Web Framer',
  'Projet de conception complète UX/UI et développement site web sur Framer',
  'UX/UI',
  'En cours',
  1040.00,
  'En cours',
  'dashboard_client'
),
(
  '{client_id}',
  'Révision design page d''accueil',
  'Amélioration du design de la page d''accueil',
  'Design',
  'Ouvert',
  350.00,
  '2-3 jours',
  'dashboard_freelance'
);
```

## 6. Insérer un devis

```sql
-- Remplacer {client_id}
INSERT INTO proposals (client_id, title, subtitle, amount, date, status)
VALUES (
  '{client_id}',
  'Conception UX/UI & Site Web Framer - Digital Radicalz',
  'UX/UI - Conception Site Web',
  '1 040,00 €',
  '24/11/2025',
  'Signé'
);
```

## 7. Insérer une facture

```sql
-- Remplacer {client_id}
INSERT INTO invoices (client_id, invoice_number, amount, due_date, status, notes)
VALUES (
  '{client_id}',
  'INV-001',
  '1 040,00€',
  '30/12/2025',
  'À envoyer',
  'Facture pour projet Digital Radicalz'
);
```

## 8. Insérer un projet

```sql
-- Remplacer {client_id}
INSERT INTO projects (client_id, name, progress, status, description)
VALUES (
  '{client_id}',
  'Site Web Digital Radicalz',
  45,
  'En cours',
  'Projet de conception et développement du site web sur Framer'
);
```

## 9. Insérer des messages

```sql
-- Remplacer {client_id}
INSERT INTO messages (client_id, from_name, content, date, read)
VALUES 
(
  '{client_id}',
  'Robin MASINI',
  'Le projet avance bien ! La première version de la maquette UX sera prête demain.',
  '24/11/2025',
  false
),
(
  '{client_id}',
  'Robin MASINI',
  'Merci pour votre confiance. Je vous tiendrai informé de l''avancement.',
  '23/11/2025',
  true
);
```

## 10. Insérer des todos

```sql
INSERT INTO todo_items (column_id, title, meta, tag, status_label, order_index)
VALUES 
('rush', 'SPRINT', 'Production Digital Radicalz', 'Sprint', '1 carte', 0),
('rush', 'Prod Digital Radicalz', 'Livraison UX/UI & Site Web', 'Rush', 'En cours', 1),
('progress', 'Conception UX/UI', 'Digital Radicalz - Site Web Framer', 'UX/UI', 'En cours', 0),
('done', 'Devis signé', 'Digital Radicalz - 1 040€', 'Done', 'Validé', 0);
```

## 11. Insérer un document

```sql
-- Remplacer {client_id}
INSERT INTO documents (client_id, name, type, size, upload_date, url)
VALUES (
  '{client_id}',
  'Devis_Digital_Radicalz_2025.pdf',
  'PDF',
  '245 KB',
  '23/11/2025',
  NULL
);
```

## Vérification

Après avoir inséré toutes ces données:

1. Se connecter en tant que client avec code `1234`
   - Vérifier que les tickets, devis, factures, projet, messages et documents s'affichent

2. Se connecter en tant que freelance avec votre email admin
   - Vérifier l'accès à toutes les données
   - Tester la création, modification et suppression

3. Tester Realtime
   - Ouvrir deux onglets (un freelance, un client)
   - Modifier un ticket dans l'un, vérifier qu'il se met à jour dans l'autre

## Notes

- Les IDs sont des UUIDs générés automatiquement par Supabase
- N'oubliez pas de remplacer `{client_id}` et `{auth_user_id}` par les vraies valeurs
- Les montants sont stockés en format texte pour faciliter l'affichage avec formatage français

