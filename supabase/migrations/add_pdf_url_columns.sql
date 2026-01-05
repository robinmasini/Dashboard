-- Migration: Ajouter les colonnes pdf_url aux tables proposals, tickets, invoices
-- Permet de stocker les URLs des PDFs uploadés dans Supabase Storage

-- 1. Ajouter pdf_url à la table proposals (devis)
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- 2. Ajouter pdf_url à la table tickets
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- 3. Ajouter pdf_url à la table invoices (factures)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Note: Créer également un bucket Storage "documents" dans le Dashboard Supabase
-- Storage → New bucket → Name: "documents" → Public bucket: ✅
