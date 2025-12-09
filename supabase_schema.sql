-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Clients Table
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    contact_name TEXT,
    industry TEXT,
    status TEXT CHECK (status IN ('En cours', 'Terminé', 'Prospect')) DEFAULT 'En cours',
    access_code TEXT UNIQUE NOT NULL, -- The 4-digit code
    notes TEXT,
    avatar_url TEXT,
    email TEXT, -- Optional, for contact
    auth_user_id UUID -- Link to Supabase Auth user if we use the "hidden login" strategy
);

-- 2. Tickets Table
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL, -- 'Design', 'UX/UI', etc.
    status TEXT CHECK (status IN ('Ouvert', 'En cours', 'Fermé', 'commandé')) DEFAULT 'Ouvert',
    price DECIMAL(10, 2) DEFAULT 0, -- Price in euros (not cents)
    eta TEXT DEFAULT 'En attente',
    source TEXT DEFAULT 'dashboard_client'
);

-- 3. Proposals Table (Devis)
CREATE TABLE proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    amount TEXT NOT NULL, -- Formatted string like "1 040,00 €"
    date TEXT NOT NULL, -- Date as string for display
    status TEXT CHECK (status IN ('Signé', 'En cours')) DEFAULT 'En cours'
);

-- 4. Invoices Table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
    invoice_number TEXT, -- e.g. 'INV-001'
    amount TEXT NOT NULL, -- Formatted string like "1 040€"
    due_date TEXT NOT NULL, -- Date as string for display like "30/11/2025"
    status TEXT CHECK (status IN ('À envoyer', 'Envoyée', 'Payée')) DEFAULT 'À envoyer',
    notes TEXT
);

-- 5. Projects Table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    progress INTEGER DEFAULT 0, -- Percentage 0-100
    status TEXT CHECK (status IN ('En cours', 'Terminé', 'En attente')) DEFAULT 'En cours',
    last_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT
);

-- 6. Messages Table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
    from_name TEXT NOT NULL, -- Display name of sender
    content TEXT NOT NULL,
    date TEXT NOT NULL, -- Date as string for display
    read BOOLEAN DEFAULT FALSE
);

-- 7. Documents Table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- e.g. "PDF", "DOCX"
    size TEXT NOT NULL, -- Formatted string like "2.3 MB"
    upload_date TEXT NOT NULL, -- Date as string for display
    url TEXT -- Optional storage URL
);

-- 8. Agenda Events
CREATE TABLE agenda_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    label TEXT NOT NULL,
    day INTEGER NOT NULL, -- 0-6 (Monday-Sunday)
    start_time INTEGER NOT NULL, -- minutes from midnight
    end_time INTEGER NOT NULL,
    type TEXT,
    color TEXT,
    source_card_id TEXT, -- Link to todo card if needed
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL -- Optional link to client
);

-- 9. Todo Items (Cards)
CREATE TABLE todo_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    column_id TEXT NOT NULL, -- 'rush', 'progress', 'done'
    title TEXT NOT NULL,
    meta TEXT,
    tag TEXT,
    status_label TEXT, -- The display status text
    order_index INTEGER DEFAULT 0, -- For ordering within column
    deadline DATE,
    notes TEXT,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL
);

-- 10. Time Tracking
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    entry_date DATE DEFAULT CURRENT_DATE,
    activity TEXT NOT NULL,
    start_time TEXT, -- HH:mm
    end_time TEXT, -- HH:mm
    bilan TEXT CHECK (bilan IN ('Top', 'Mauvais', 'À améliorer')),
    notes TEXT
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Strategy: 
-- - Freelance admin identified by metadata role = 'freelance' or specific email
-- - Clients identified by auth.uid() = clients.auth_user_id

-- Enable RLS on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is freelance admin
CREATE OR REPLACE FUNCTION is_freelance_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'freelance',
      false
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get client_id for current user
CREATE OR REPLACE FUNCTION get_client_id_for_user()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM clients WHERE auth_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CLIENTS TABLE POLICIES
-- ============================================
-- Freelance can do everything
CREATE POLICY "Freelance full access to clients"
ON clients FOR ALL
USING (is_freelance_admin())
WITH CHECK (is_freelance_admin());

-- Clients can view only their own data
CREATE POLICY "Clients can view own data"
ON clients FOR SELECT
USING (auth.uid() = auth_user_id);

-- ============================================
-- TICKETS TABLE POLICIES
-- ============================================
-- Freelance can do everything
CREATE POLICY "Freelance full access to tickets"
ON tickets FOR ALL
USING (is_freelance_admin())
WITH CHECK (is_freelance_admin());

-- Clients can view their own tickets
CREATE POLICY "Clients can view own tickets"
ON tickets FOR SELECT
USING (client_id = get_client_id_for_user());

-- Clients can create tickets for themselves
CREATE POLICY "Clients can create own tickets"
ON tickets FOR INSERT
WITH CHECK (client_id = get_client_id_for_user());

-- Clients can update their own tickets (status only)
CREATE POLICY "Clients can update own tickets"
ON tickets FOR UPDATE
USING (client_id = get_client_id_for_user())
WITH CHECK (client_id = get_client_id_for_user());

-- ============================================
-- PROPOSALS TABLE POLICIES
-- ============================================
-- Freelance can do everything
CREATE POLICY "Freelance full access to proposals"
ON proposals FOR ALL
USING (is_freelance_admin())
WITH CHECK (is_freelance_admin());

-- Clients can view their own proposals
CREATE POLICY "Clients can view own proposals"
ON proposals FOR SELECT
USING (client_id = get_client_id_for_user());

-- ============================================
-- INVOICES TABLE POLICIES
-- ============================================
-- Freelance can do everything
CREATE POLICY "Freelance full access to invoices"
ON invoices FOR ALL
USING (is_freelance_admin())
WITH CHECK (is_freelance_admin());

-- Clients can view their own invoices
CREATE POLICY "Clients can view own invoices"
ON invoices FOR SELECT
USING (client_id = get_client_id_for_user());

-- ============================================
-- PROJECTS TABLE POLICIES
-- ============================================
-- Freelance can do everything
CREATE POLICY "Freelance full access to projects"
ON projects FOR ALL
USING (is_freelance_admin())
WITH CHECK (is_freelance_admin());

-- Clients can view their own projects
CREATE POLICY "Clients can view own projects"
ON projects FOR SELECT
USING (client_id = get_client_id_for_user());

-- ============================================
-- MESSAGES TABLE POLICIES
-- ============================================
-- Freelance can do everything
CREATE POLICY "Freelance full access to messages"
ON messages FOR ALL
USING (is_freelance_admin())
WITH CHECK (is_freelance_admin());

-- Clients can view their own messages
CREATE POLICY "Clients can view own messages"
ON messages FOR SELECT
USING (client_id = get_client_id_for_user());

-- Clients can mark their own messages as read
CREATE POLICY "Clients can update own messages"
ON messages FOR UPDATE
USING (client_id = get_client_id_for_user())
WITH CHECK (client_id = get_client_id_for_user());

-- ============================================
-- DOCUMENTS TABLE POLICIES
-- ============================================
-- Freelance can do everything
CREATE POLICY "Freelance full access to documents"
ON documents FOR ALL
USING (is_freelance_admin())
WITH CHECK (is_freelance_admin());

-- Clients can view their own documents
CREATE POLICY "Clients can view own documents"
ON documents FOR SELECT
USING (client_id = get_client_id_for_user());

-- ============================================
-- AGENDA EVENTS TABLE POLICIES
-- ============================================
-- Freelance can do everything on agenda
CREATE POLICY "Freelance full access to agenda_events"
ON agenda_events FOR ALL
USING (is_freelance_admin())
WITH CHECK (is_freelance_admin());

-- Clients can view agenda events linked to them
CREATE POLICY "Clients can view related agenda_events"
ON agenda_events FOR SELECT
USING (client_id = get_client_id_for_user() OR client_id IS NULL);

-- ============================================
-- TODO ITEMS TABLE POLICIES
-- ============================================
-- Freelance can do everything on todos
CREATE POLICY "Freelance full access to todo_items"
ON todo_items FOR ALL
USING (is_freelance_admin())
WITH CHECK (is_freelance_admin());

-- Clients can view todos (read-only)
CREATE POLICY "Clients can view todo_items"
ON todo_items FOR SELECT
USING (true); -- All clients can see todos for now

-- ============================================
-- TIME ENTRIES TABLE POLICIES
-- ============================================
-- Only Freelance can access time tracking (private)
CREATE POLICY "Freelance full access to time_entries"
ON time_entries FOR ALL
USING (is_freelance_admin())
WITH CHECK (is_freelance_admin());

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_tickets_client_id ON tickets(client_id);
CREATE INDEX idx_proposals_client_id ON proposals(client_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_messages_client_id ON messages(client_id);
CREATE INDEX idx_documents_client_id ON documents(client_id);
CREATE INDEX idx_todo_items_column_id ON todo_items(column_id);
CREATE INDEX idx_todo_items_order ON todo_items(column_id, order_index);
CREATE INDEX idx_time_entries_date ON time_entries(entry_date);
CREATE INDEX idx_clients_auth_user_id ON clients(auth_user_id);
CREATE INDEX idx_clients_access_code ON clients(access_code);
