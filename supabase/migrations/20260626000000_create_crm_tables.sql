-- 1. CRM Companies Table
CREATE TABLE IF NOT EXISTS crm_companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    name TEXT NOT NULL,
    domain TEXT, -- Secteur d'activité / domaine
    website TEXT,
    linkedin_url TEXT,
    wttj_url TEXT,
    indeed_url TEXT,
    description TEXT,
    recruitment_notes TEXT,
    project_name TEXT, -- Lexona, SurgiLink, Casper, etc.
    source TEXT DEFAULT 'brightdata'
);

-- 2. CRM Contacts Table
CREATE TABLE IF NOT EXISTS crm_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    company_id UUID REFERENCES crm_companies(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    role TEXT, -- e.g. HR Manager, Tech Recruiter, CEO
    linkedin_url TEXT,
    status TEXT CHECK (status IN ('à contacter', 'contacté', 'à relancer', 'relancé', 'accepté', 'refusé')) DEFAULT 'à contacter',
    channel TEXT CHECK (channel IN ('email', 'whatsapp', 'linkedin', 'welcometothejungle', 'indeed')) DEFAULT 'linkedin',
    notes TEXT,
    last_contact_date DATE,
    next_followup_date DATE
);

-- 3. CRM Templates Table
CREATE TABLE IF NOT EXISTS crm_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    name TEXT NOT NULL,
    subject TEXT,
    body TEXT NOT NULL
);

-- 4. CRM Settings Table
CREATE TABLE IF NOT EXISTS crm_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    brightdata_api_key TEXT,
    brightdata_scraper_id TEXT,
    linkedin_cookie TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Row Level Security (RLS) Policies
ALTER TABLE crm_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_settings ENABLE ROW LEVEL SECURITY;

-- Helper function is_freelance_admin() is assumed to already exist from main schema.sql
-- We will use it here to secure the CRM tables.

CREATE POLICY "Freelance full access to crm_companies"
ON crm_companies FOR ALL
USING (is_freelance_admin())
WITH CHECK (is_freelance_admin());

CREATE POLICY "Freelance full access to crm_contacts"
ON crm_contacts FOR ALL
USING (is_freelance_admin())
WITH CHECK (is_freelance_admin());

CREATE POLICY "Freelance full access to crm_templates"
ON crm_templates FOR ALL
USING (is_freelance_admin())
WITH CHECK (is_freelance_admin());

CREATE POLICY "Freelance full access to crm_settings"
ON crm_settings FOR ALL
USING (is_freelance_admin())
WITH CHECK (is_freelance_admin());

-- Indexes for search optimization
CREATE INDEX IF NOT EXISTS idx_crm_companies_name ON crm_companies(name);
CREATE INDEX IF NOT EXISTS idx_crm_companies_project ON crm_companies(project_name);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_company_id ON crm_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_status ON crm_contacts(status);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_next_followup ON crm_contacts(next_followup_date);
