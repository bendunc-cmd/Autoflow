-- ============================================
-- AutoFlow AI: Lead Engine Database Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- Add new columns to profiles table for business setup
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_description TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_services TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_website TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS response_tone TEXT DEFAULT 'friendly' CHECK (response_tone IN ('professional', 'friendly', 'casual'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auto_reply_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE;

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  source TEXT DEFAULT 'website_form',
  urgency TEXT DEFAULT 'warm' CHECK (urgency IN ('hot', 'warm', 'cold')),
  category TEXT,
  ai_summary TEXT,
  ai_response_sent TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  follow_up_count INTEGER DEFAULT 0,
  next_follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead activities table (timeline/audit log)
CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('auto_reply', 'follow_up', 'note', 'status_change', 'email_sent')),
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

-- Leads policies
DROP POLICY IF EXISTS "Users can view own leads" ON leads;
DROP POLICY IF EXISTS "Users can create own leads" ON leads;
DROP POLICY IF EXISTS "Users can update own leads" ON leads;
DROP POLICY IF EXISTS "Service role can manage all leads" ON leads;

CREATE POLICY "Users can view own leads" ON leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own leads" ON leads FOR UPDATE USING (auth.uid() = user_id);
-- Allow inserts from service role (webhook API route)
CREATE POLICY "Service role can manage all leads" ON leads FOR ALL USING (true) WITH CHECK (true);

-- Lead activities policies
DROP POLICY IF EXISTS "Users can view own lead activities" ON lead_activities;
DROP POLICY IF EXISTS "Service role can manage all activities" ON lead_activities;

CREATE POLICY "Users can view own lead activities" ON lead_activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage all activities" ON lead_activities FOR ALL USING (true) WITH CHECK (true);

-- Index for faster lead queries
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_urgency ON leads(urgency);
CREATE INDEX IF NOT EXISTS idx_leads_next_follow_up ON leads(next_follow_up_at) WHERE next_follow_up_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_profiles_api_key ON profiles(api_key) WHERE api_key IS NOT NULL;

-- Update the profiles RLS to allow updates to new columns
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
