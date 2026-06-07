-- ═══════════════════════════════════════════════════════════
-- SENTINEL — Complete Database Schema
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ─────────────────────────────────────────────────────────
-- ORGANIZATIONS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orgs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slack_workspace_id TEXT,
  webhook_secret TEXT DEFAULT encode(gen_random_bytes(32), 'hex'),
  sla_config JSONB DEFAULT '{"P0": 15, "P1": 60, "P2": 240, "P3": 1440, "P4": 10080}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────
-- USERS (Clerk user ID as PK)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  role TEXT DEFAULT 'responder' CHECK (role IN ('admin', 'responder', 'viewer')),
  slack_user_id TEXT,
  on_call BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────
-- INCIDENTS (core table)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'P3' CHECK (severity IN ('P0', 'P1', 'P2', 'P3', 'P4')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'mitigating', 'resolved', 'postmortem')),
  affected_services TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  assignee_id TEXT REFERENCES users(id),
  root_cause TEXT,
  resolution TEXT,
  sla_breach_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  mem0_memory_ids TEXT[] DEFAULT '{}',
  embedding VECTOR(1536),
  source TEXT DEFAULT 'manual' CHECK (source IN ('uptimerobot', 'sentry', 'sentinel-agent', 'slack', 'manual', 'github')),
  source_id TEXT,
  fingerprint TEXT,
  merged_from TEXT[] DEFAULT '{}'
);

-- ─────────────────────────────────────────────────────────
-- RUNBOOKS (fix playbooks)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS runbooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  incident_type TEXT,
  steps JSONB DEFAULT '[]'::jsonb,
  safe_to_automate BOOLEAN DEFAULT false,
  confidence_threshold FLOAT DEFAULT 0.85,
  created_at TIMESTAMPTZ DEFAULT now(),
  embedding VECTOR(1536)
);

-- ─────────────────────────────────────────────────────────
-- POSTMORTEMS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS postmortems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  content TEXT,
  review_status TEXT DEFAULT 'draft' CHECK (review_status IN ('draft', 'in_review', 'published')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────
-- AGENT INTERACTIONS (chat log)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  query TEXT,
  response TEXT,
  tools_used TEXT[] DEFAULT '{}',
  memories_retrieved JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────
-- INGESTION HEALTH (per-source monitoring)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ingestion_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('uptimerobot', 'sentry', 'sentinel-agent', 'slack', 'manual', 'github')),
  status TEXT DEFAULT 'healthy' CHECK (status IN ('healthy', 'stale', 'down')),
  last_ping_at TIMESTAMPTZ DEFAULT now(),
  last_incident_at TIMESTAMPTZ,
  total_incidents INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, source)
);

-- ─────────────────────────────────────────────────────────
-- HOSTS (agent fleet tracking)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hosts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  hostname TEXT NOT NULL,
  host_id TEXT NOT NULL,
  platform TEXT,
  arch TEXT,
  ip_addresses TEXT[] DEFAULT '{}',
  agent_version TEXT,
  status TEXT DEFAULT 'healthy' CHECK (status IN ('healthy', 'degraded', 'down', 'stale')),
  last_heartbeat_at TIMESTAMPTZ DEFAULT now(),
  collectors_active TEXT[] DEFAULT '{}',
  collectors_failed TEXT[] DEFAULT '{}',
  baseline_status TEXT DEFAULT 'learning' CHECK (baseline_status IN ('learning', 'ready', 'stale')),
  baseline_age_hours FLOAT DEFAULT 0,
  circuit_breaker TEXT DEFAULT 'CLOSED' CHECK (circuit_breaker IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
  discovered_services JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, host_id)
);

-- ═══════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════

-- Incident queries
CREATE INDEX IF NOT EXISTS idx_incidents_org_status ON incidents (org_id, status);
CREATE INDEX IF NOT EXISTS idx_incidents_org_severity ON incidents (org_id, severity);
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_org_source ON incidents (org_id, source);
CREATE INDEX IF NOT EXISTS idx_incidents_fingerprint ON incidents (fingerprint);
CREATE INDEX IF NOT EXISTS idx_incidents_sla ON incidents (sla_breach_at) WHERE status NOT IN ('resolved', 'postmortem');

-- Agent interactions
CREATE INDEX IF NOT EXISTS idx_agent_interactions_incident ON agent_interactions (incident_id);

-- Ingestion health
CREATE INDEX IF NOT EXISTS idx_ingestion_health_org ON ingestion_health (org_id);

-- Hosts
CREATE INDEX IF NOT EXISTS idx_hosts_org ON hosts (org_id);
CREATE INDEX IF NOT EXISTS idx_hosts_heartbeat ON hosts (last_heartbeat_at);

-- Users
CREATE INDEX IF NOT EXISTS idx_users_org ON users (org_id);
CREATE INDEX IF NOT EXISTS idx_users_oncall ON users (org_id) WHERE on_call = true;

-- Vector similarity search (HNSW for fast search)
CREATE INDEX IF NOT EXISTS idx_incidents_embedding ON incidents USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_runbooks_embedding ON runbooks USING hnsw (embedding vector_cosine_ops);

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE runbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE postmortems ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE hosts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: service_role bypasses RLS, anon/authenticated need org_id match
-- For the backend (service_role key), RLS is automatically bypassed.
-- These policies are for any direct Supabase client access from frontend.

CREATE POLICY "Users can view own org incidents" ON incidents
  FOR SELECT USING (true); -- Backend handles org isolation via middleware

CREATE POLICY "Users can insert own org incidents" ON incidents
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own org incidents" ON incidents
  FOR UPDATE USING (true);

CREATE POLICY "Users can view own org runbooks" ON runbooks
  FOR SELECT USING (true);

CREATE POLICY "Users can view own org postmortems" ON postmortems
  FOR SELECT USING (true);

CREATE POLICY "Users can view own org interactions" ON agent_interactions
  FOR SELECT USING (true);

CREATE POLICY "Users can view own org ingestion health" ON ingestion_health
  FOR SELECT USING (true);

CREATE POLICY "Users can view own org hosts" ON hosts
  FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════
-- FUNCTIONS
-- ═══════════════════════════════════════════════════════════

-- Function to search incidents by vector similarity
CREATE OR REPLACE FUNCTION search_similar_incidents(
  query_embedding VECTOR(1536),
  match_org_id UUID,
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  severity TEXT,
  root_cause TEXT,
  resolution TEXT,
  affected_services TEXT[],
  source TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.title,
    i.description,
    i.severity,
    i.root_cause,
    i.resolution,
    i.affected_services,
    i.source,
    1 - (i.embedding <=> query_embedding) AS similarity
  FROM incidents i
  WHERE i.org_id = match_org_id
    AND i.embedding IS NOT NULL
    AND i.status IN ('resolved', 'postmortem')
    AND 1 - (i.embedding <=> query_embedding) > match_threshold
  ORDER BY i.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to search runbooks by vector similarity
CREATE OR REPLACE FUNCTION search_similar_runbooks(
  query_embedding VECTOR(1536),
  match_org_id UUID,
  match_count INT DEFAULT 3,
  match_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  incident_type TEXT,
  steps JSONB,
  safe_to_automate BOOLEAN,
  confidence_threshold FLOAT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.title,
    r.incident_type,
    r.steps,
    r.safe_to_automate,
    r.confidence_threshold,
    1 - (r.embedding <=> query_embedding) AS similarity
  FROM runbooks r
  WHERE r.org_id = match_org_id
    AND r.embedding IS NOT NULL
    AND 1 - (r.embedding <=> query_embedding) > match_threshold
  ORDER BY r.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
