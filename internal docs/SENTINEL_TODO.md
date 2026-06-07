# SENTINEL — Manual TODO (Do These Before Writing Any Code)
### Everything you personally need to set up. First-timer friendly.

---

## STEP 1 — CREATE ALL ACCOUNTS (30 mins, all free)

Do these in order. Open each in a new tab and don't close until you have the key/token.

---

### 1.1 Supabase (Database + Vector Search + Real-time)
**URL:** https://supabase.com

1. Click "Start your project" → sign up with GitHub
2. Click "New project"
3. Name: `sentinel`
4. Database password: create a strong one, **SAVE IT SOMEWHERE**
5. Region: pick closest to India (Singapore)
6. Click "Create new project" → wait 2 mins
7. Once ready: go to **Settings → API**
8. Copy and save:
   - `Project URL` → this is your `SUPABASE_URL`
   - `anon public` key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → this is your `SUPABASE_SERVICE_ROLE_KEY` (keep secret)
9. Go to **Database → Extensions** → search "vector" → enable `vector` extension
10. Go to **SQL Editor** → run this to verify: `SELECT version();` — should return something

**Free tier gives you:** 500MB database, pgvector included, real-time, auth — all free forever.

---

### 1.2 Clerk (Authentication)
**URL:** https://clerk.com

1. Sign up → "Create application"
2. Name: `Sentinel`
3. Enable: Email + Google login
4. Click "Create application"
5. You land on the quickstart page — ignore the code for now
6. Go to **API Keys** (left sidebar)
7. Copy and save:
   - `Publishable Key` → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `Secret Key` → `CLERK_SECRET_KEY`
8. Go to **Webhooks** → "Add endpoint"
   - URL: `https://your-backend-url.railway.app/api/webhooks/clerk` (you'll fill this later)
   - Subscribe to: `user.created`, `user.updated`
   - Save the **Signing Secret** → `CLERK_WEBHOOK_SECRET`

**Free tier gives you:** 10,000 monthly active users — way more than enough.

---

### 1.3 Groq (LLM — the AI brain)
**URL:** https://console.groq.com

1. Sign up with Google or GitHub
2. Go to **API Keys** → "Create API Key"
3. Name: `sentinel-hackathon`
4. Copy and save → `GROQ_API_KEY`

**Free tier gives you:** 1000 requests/day, 6000 tokens/minute for qwen3-32b. No credit card.

---

### 1.4 Mem0 (AI Memory Layer)
**URL:** https://app.mem0.ai

1. Sign up
2. Go to **API Keys** → generate a key
3. Copy and save → `MEM0_API_KEY`
4. Note your User ID shown on the dashboard

**Free Hobby plan gives you:** 10,000 memories, 1000 retrieval calls/month. Zero cost.

---

### 1.5 Slack (for the bot)
**URL:** https://api.slack.com/apps

> You need a Slack workspace to test in. Create a free workspace if you don't have one:
> https://slack.com/get-started → create workspace → name it "Sentinel Test"

1. Go to https://api.slack.com/apps → "Create New App"
2. Choose "From scratch"
3. Name: `Sentinel`, pick your workspace
4. Go to **OAuth & Permissions** (left sidebar)
5. Under "Bot Token Scopes" add these:
   - `chat:write`
   - `chat:write.public`
   - `commands`
   - `channels:read`
   - `im:write`
   - `users:read`
6. Go to **Slash Commands** → "Create New Command"
   - Command: `/sentinel`
   - Request URL: `https://your-backend-url.railway.app/api/slack/commands` (fill later)
   - Description: `Manage incidents with Sentinel`
   - Save
7. Go to **Install App** → "Install to Workspace" → Allow
8. Copy and save:
   - `Bot User OAuth Token` → `SLACK_BOT_TOKEN`
9. Go to **Basic Information** → "App Credentials"
   - Copy `Signing Secret` → `SLACK_SIGNING_SECRET`
10. Go to **Socket Mode** → enable it → generate token → `SLACK_APP_TOKEN`

---

### 1.6 Resend (Email notifications)
**URL:** https://resend.com

1. Sign up
2. Go to **API Keys** → "Create API Key"
3. Copy and save → `RESEND_API_KEY`

**Free tier:** 3000 emails/month. More than enough.

---

### 1.7 Upstash (Redis for queues + rate limiting)
**URL:** https://console.upstash.com

1. Sign up
2. "Create Database" → name: `sentinel`, region: Singapore, type: Regional
3. Once created, go to the database → "REST API" section
4. Copy and save:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

**Free tier:** 10,000 commands/day. Free forever.

---

### 1.8 Vercel (Frontend deployment)
**URL:** https://vercel.com

1. Sign up with GitHub
2. Don't create a project yet — you'll do this when you push code
3. Just make sure your GitHub account is connected

---

### 1.9 Railway (Backend deployment)
**URL:** https://railway.app

1. Sign up with GitHub
2. You get $5 free credit (enough for hackathon)
3. Don't create a project yet — do it when you push backend code

---

## STEP 2 — SET UP SUPABASE DATABASE SCHEMA (15 mins)

1. Go to your Supabase project → **SQL Editor**
2. Click "New query"
3. Paste and run this entire SQL (AI will refine it, but this is the base):

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Organizations table
CREATE TABLE orgs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slack_workspace_id TEXT,
  webhook_secret TEXT DEFAULT encode(gen_random_bytes(32), 'hex'),
  sla_config JSONB DEFAULT '{"P0": 15, "P1": 60, "P2": 240, "P3": 1440}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY, -- Clerk user ID
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  role TEXT DEFAULT 'responder' CHECK (role IN ('admin', 'responder', 'viewer')),
  slack_user_id TEXT,
  on_call BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Incidents table
CREATE TABLE incidents (
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
  embedding VECTOR(1536)
);

-- Runbooks table
CREATE TABLE runbooks (
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

-- Postmortems table
CREATE TABLE postmortems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  content TEXT,  -- Markdown formatted postmortem
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Agent interactions log
CREATE TABLE agent_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  query TEXT,
  response TEXT,
  tools_used TEXT[] DEFAULT '{}',
  memories_retrieved JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX ON incidents (org_id, status);
CREATE INDEX ON incidents (org_id, severity);
CREATE INDEX ON incidents (created_at DESC);
CREATE INDEX ON agent_interactions (incident_id);

-- Vector similarity search index (HNSW for fast search)
CREATE INDEX ON incidents USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON runbooks USING hnsw (embedding vector_cosine_ops);

-- Row Level Security (org isolation)
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE runbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE postmortems ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_interactions ENABLE ROW LEVEL SECURITY;
```

4. Click "Run" — should say "Success"
5. Go to **Table Editor** → verify all tables are created

---

## STEP 3 — CREATE YOUR ENV FILES (10 mins)

1. In your project root, create two files:

**`backend/.env`**
```
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here
CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret_here
GROQ_API_KEY=your_groq_key_here
MEM0_API_KEY=your_mem0_key_here
SLACK_BOT_TOKEN=xoxb-your-token-here
SLACK_SIGNING_SECRET=your_signing_secret_here
SLACK_APP_TOKEN=xapp-your-token-here
RESEND_API_KEY=your_resend_key_here
UPSTASH_REDIS_REST_URL=your_upstash_url_here
UPSTASH_REDIS_REST_TOKEN=your_upstash_token_here
WEBHOOK_SECRET=generate-a-random-string-here
PORT=3001
```

**`frontend/.env.local`**
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

2. **Never commit these files to GitHub.** Make sure `.env` and `.env.local` are in `.gitignore`

---

## STEP 4 — INSTALL TOOLS ON YOUR MACHINE (20 mins)

Open your terminal and run these one by one:

```bash
# Check if Node.js is installed (need v20+)
node --version

# If not installed or old version, install from: https://nodejs.org
# Download LTS version

# Install pnpm (faster than npm, better for monorepos)
npm install -g pnpm

# Verify
pnpm --version

# Install git if not already
git --version
```

---

## STEP 5 — SEED REALISTIC INCIDENTS (do after backend is running)

Once your backend runs, run the seed script the AI will write for you. It will create 10 realistic incidents like:

1. Redis connection pool exhausted — payments service
2. PostgreSQL max connections hit — orders API  
3. SSL certificate expired — main domain
4. Memory leak in Node.js worker — email queue
5. DNS misconfiguration after deployment
6. API rate limit breach — Stripe webhooks dropping
7. Kubernetes pod OOMKilled — recommendation service
8. CDN cache poisoning — incorrect responses served
9. Unauthorized API access spike — security incident (your angle)
10. Database index missing — query timeouts across all services

These get stored in both your Supabase DB AND Mem0. This gives the agent real memory before the demo.

---

## STEP 6 — SLACK APP SETUP CHECKLIST

After your backend is deployed to Railway:

1. Go back to https://api.slack.com/apps → your Sentinel app
2. Update the Slash Command URL to your Railway backend URL
3. Go to **Event Subscriptions** → enable → add your backend URL
4. Subscribe to bot events: `message.channels`, `app_mention`
5. Go to **Interactivity & Shortcuts** → enable → add your backend URL
6. Reinstall the app to workspace if prompted

---

## STEP 7 — DEPLOY CHECKLIST

### Frontend → Vercel
1. Push frontend code to GitHub
2. Go to vercel.com → "Import Project" → select your repo → select `frontend` folder
3. Add all `NEXT_PUBLIC_*` env vars in Vercel dashboard
4. Deploy → get your URL → update `NEXT_PUBLIC_APP_URL`

### Backend → Railway
1. Push backend code to GitHub  
2. Go to railway.app → "New Project" → "Deploy from GitHub"
3. Select backend folder
4. Add all backend env vars in Railway dashboard
5. Deploy → get your URL
6. Update Slack slash command URL + Clerk webhook URL with Railway URL

---

## QUICK REFERENCE — ALL YOUR KEYS

Keep this filled in somewhere safe (NOT committed to git):

```
SUPABASE_URL                    = 
SUPABASE_SERVICE_ROLE_KEY       = 
NEXT_PUBLIC_SUPABASE_ANON_KEY   = 
CLERK_SECRET_KEY                = 
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 
CLERK_WEBHOOK_SECRET            = 
GROQ_API_KEY                    = 
MEM0_API_KEY                    = 
SLACK_BOT_TOKEN                 = 
SLACK_SIGNING_SECRET            = 
SLACK_APP_TOKEN                 = 
RESEND_API_KEY                  = 
UPSTASH_REDIS_REST_URL          = 
UPSTASH_REDIS_REST_TOKEN        = 
RAILWAY_BACKEND_URL             = 
VERCEL_FRONTEND_URL             = 
```

---

## WHAT TO TELL YOUR AI CODING AGENT

When you start prompting Cursor/Jules/Codex, give it the impl plan + this context upfront:

> "We are building Sentinel, an AI incident response platform. Tech stack: Next.js 14 App Router frontend, Node.js Express backend, Supabase PostgreSQL with pgvector, Clerk auth, Mem0 for AI memory, Groq (qwen3-32b) as LLM, LangChain.js for agent orchestration, Slack Bolt SDK for Slack integration. All API keys are in env vars — never hardcode. Use TypeScript everywhere. Follow the folder structure in the impl plan."

Then build phase by phase. Don't try to build everything at once.

---

## ESTIMATED TIME PER PHASE

| Phase | Time |
|---|---|
| Accounts + setup (this doc) | 1 hour |
| Phase 1: Skeleton + deploy | 2 hours |
| Phase 2: Core incident API | 2 hours |
| Phase 3: Agent + memory | 3 hours |
| Phase 4: Frontend agent UI | 2 hours |
| Phase 5: Postmortem + analytics | 1.5 hours |
| Phase 6: Slack bot | 1.5 hours |
| Phase 7: Seed + demo prep | 1 hour |
| **Total** | **~14 hours** |

Hackathon pace with AI coding: realistic to finish phases 1-6 in a single day.
