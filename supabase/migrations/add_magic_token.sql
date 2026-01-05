-- Migration: Ajouter le champ magic_token pour les liens de connexion automatique
-- Ce token permet aux clients d'accéder à leur compte en un clic

-- 1. Ajouter la colonne magic_token à la table clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS magic_token VARCHAR(64) UNIQUE;

-- 2. Générer des tokens uniques pour les clients existants
-- Les tokens sont des chaînes aléatoires sécurisées
UPDATE clients 
SET magic_token = encode(gen_random_bytes(24), 'hex')
WHERE magic_token IS NULL;

-- Note: Pour chaque client, le mot de passe dans auth.users doit correspondre 
-- au magic_token pour que la connexion automatique fonctionne.
-- Exécutez les commandes suivantes pour mettre à jour les mots de passe :

-- IMPORTANT: Après avoir exécuté cette migration, récupérez les magic_tokens
-- avec cette requête:
-- SELECT name, email, magic_token FROM clients WHERE name IN ('Melvin Felix', 'Digital Radicalz', 'Hacene MALT');

-- Puis mettez à jour les mots de passe dans Supabase Dashboard > Authentication > Users
-- ou via l'API admin.
