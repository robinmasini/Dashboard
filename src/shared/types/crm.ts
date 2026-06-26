export interface CRMCompany {
  id: string
  created_at?: string
  name: string
  domain?: string
  website?: string
  linkedin_url?: string
  wttj_url?: string
  indeed_url?: string
  description?: string
  recruitment_notes?: string
  project_name?: string // Lexona, SurgiLink, Casper, etc.
  source?: string // 'brightdata' | 'manual' | 'linkedin'
}

export interface CRMContact {
  id: string
  created_at?: string
  company_id: string
  first_name: string
  last_name?: string
  email?: string
  phone?: string
  role?: string // e.g. HR Manager, Tech Recruiter, CEO
  linkedin_url?: string
  status: 'à contacter' | 'contacté' | 'à relancer' | 'relancé' | 'accepté' | 'refusé'
  channel: 'email' | 'whatsapp' | 'linkedin' | 'welcometothejungle' | 'indeed'
  notes?: string
  last_contact_date?: string
  next_followup_date?: string
}

export interface CRMTemplate {
  id: string
  created_at?: string
  name: string
  subject?: string
  body: string
}

export interface CRMSettings {
  id?: string
  created_at?: string
  brightdata_api_key?: string
  brightdata_scraper_id?: string
  linkedin_cookie?: string
  updated_at?: string
}
