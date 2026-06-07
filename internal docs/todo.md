# Sentinel — Manual Setup TODO
### Everything you need to do by hand AFTER the code is built
### Do these in order. Each step depends on the ones before it.

---

## ✅ Status Legend
- `[ ]` Not started
- `[x]` Done

---

## STEP 1 — Install Tools (5 mins)

- [ ] **Node.js v20+** — Download from https://nodejs.org (LTS version)
  ```bash
  node --version   # should show v20+
  ```
- [ ] **pnpm** — Install globally
  ```bash
  npm install -g pnpm
  pnpm --version   # should show 9+
  ```
- [ ] **Git** — Verify installed
  ```bash
  git --version
  ```

---

## STEP 2 — Create All Accounts (30 mins, ALL FREE)

> Open each in a new tab. Don't close until you have the key saved.

---

### 2.1 Supabase (Database + Vector Search + Real-time)
**URL:** https://supabase.com

- [ ] Sign up with GitHub
- [ ] Click "New Project"
  - Name: `sentinel`
  - Database password: **create strong password → SAVE IT**
  - Region: **Singapore** (closest to India)
- [ ] Wait ~2 mins for project to provision
- [ ] Go to **Settings → API** and copy:
  - [ ] `Project URL` → this is your `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `anon public` key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `service_role` key → this is your `SUPABASE_SERVICE_ROLE_KEY` (**keep secret!**)
- [ ] Go to **Database → Extensions** → search "vector" → **enable `vector`**
- [ ] Go to **SQL Editor** → click "New query" → paste the entire contents of `apps/api/src/db/schema.sql` → click **Run**
  - Should say "Success. No rows returned"
- [ ] Go to **Table Editor** → verify these 8 tables exist:
  - `orgs`, `users`, `incidents`, `runbooks`, `postmortems`, `agent_interactions`, `ingestion_health`, `hosts`

**Free tier:** 500MB database, pgvector included, real-time, auth — free forever.

---

### 2.2 Clerk (Authentication)
**URL:** https://clerk.com

- [ ] Sign up → "Create application"
  - Name: `Sentinel`
  - Enable: **Email + Google** login
- [ ] Go to **API Keys** (left sidebar) and copy:
  - [ ] `Publishable Key` → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - [ ] `Secret Key` → `CLERK_SECRET_KEY`
- [ ] Go to **Webhooks** → "Add endpoint"
  - URL: `https://your-render-backend-url.onrender.com/api/webhooks/clerk`
  - Subscribe to: `user.created`, `user.updated`
  - [ ] Copy **Signing Secret** → `CLERK_WEBHOOK_SECRET`

> ⚠️ You'll update the webhook URL after deploying the backend to Render.

**Free tier:** 10,000 monthly active users.

---

### 2.3 Groq (LLM — the AI brain)
**URL:** https://console.groq.com

- [ ] Sign up with Google or GitHub
- [ ] Go to **API Keys** → "Create API Key"
  - Name: `sentinel-hackathon`
- [ ] Copy key → `GROQ_API_KEY`

**Free tier:** 1000 req/day, 6000 tokens/min for qwen3-32b. No credit card.

---

### 2.4 Mem0 (AI Memory Layer)
**URL:** https://app.mem0.ai

- [ ] Sign up
- [ ] Go to **API Keys** → generate a key
- [ ] Copy key → `MEM0_API_KEY`

**Free Hobby plan:** 10,000 memories, 1000 retrieval calls/month.

---

### 2.5 Slack Bot
**URL:** https://api.slack.com/apps

> You need a Slack workspace. Create a free one at https://slack.com/get-started if you don't have one.

- [ ] Go to https://api.slack.com/apps → **"Create New App"**
  - Choose **"From scratch"**
  - Name: `Sentinel`, pick your workspace
- [ ] Go to **OAuth & Permissions** → add these **Bot Token Scopes**:
  - `chat:write`, `chat:write.public`, `commands`, `channels:read`, `im:write`, `users:read`
- [ ] Go to **Slash Commands** → "Create New Command":
  - Command: `/sentinel`
  - Request URL: `https://your-render-backend-url.onrender.com/api/slack/commands` *(update after deploy)*
  - Description: `Manage incidents with Sentinel`
- [ ] Go to **Install App** → "Install to Workspace" → Allow
- [ ] Copy **Bot User OAuth Token** → `SLACK_BOT_TOKEN`
- [ ] Go to **Basic Information** → App Credentials:
  - [ ] Copy `Signing Secret` → `SLACK_SIGNING_SECRET`
- [ ] Go to **Socket Mode** → enable → generate token → `SLACK_APP_TOKEN`

---

### 2.6 Resend (Email notifications)
**URL:** https://resend.com

- [ ] Sign up
- [ ] Go to **API Keys** → "Create API Key"
- [ ] Copy key → `RESEND_API_KEY`

**Free tier:** 3000 emails/month.

---

### 2.7 Upstash (Redis for rate limiting + queues)
**URL:** https://console.upstash.com

- [ ] Sign up
- [ ] "Create Database"
  - Name: `sentinel`
  - Region: **Singapore**
  - Type: **Regional**
- [ ] Go to database → **REST API** section
- [ ] Copy:
  - [ ] `UPSTASH_REDIS_REST_URL`
  - [ ] `UPSTASH_REDIS_REST_TOKEN`

**Free tier:** 10,000 commands/day. Free forever.

---

### 2.8 UptimeRobot (Infrastructure Monitoring)
**URL:** https://uptimerobot.com

- [ ] Sign up (free)
- [ ] Go to **My Settings** → **API Settings** → create **Main API Key**
- [ ] Copy key → `UPTIMEROBOT_API_KEY`
- [ ] Generate a random secret string → `UPTIMEROBOT_WEBHOOK_SECRET`

> You'll create monitors AFTER deploying the demo app.

**Free tier:** 50 monitors, 5-min intervals.

---

### 2.9 Sentry (Application Error Monitoring)
**URL:** https://sentry.io

- [ ] Sign up (free)
- [ ] Create new project → Platform: **Next.js** → Name: `sentinel-demo-app`
- [ ] Copy **DSN** → `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`
- [ ] Go to **Settings → Integrations → Webhooks**
  - Add webhook URL: `https://your-render-backend-url.onrender.com/api/webhooks/sentry`
- [ ] Go to **Settings → Developer Settings → Internal Integrations** or **Webhooks**
  - Copy/generate secret → `SENTRY_WEBHOOK_SECRET`

**Free tier:** 5k errors/month, APM.

---

## STEP 3 — Fill In Your .env Files (10 mins)

- [ ] Copy `.env.example` from project root
- [ ] Create `apps/api/.env` and fill in ALL backend values:
  ```
  SUPABASE_URL=
  SUPABASE_SERVICE_ROLE_KEY=
  CLERK_SECRET_KEY=
  CLERK_WEBHOOK_SECRET=
  GROQ_API_KEY=
  MEM0_API_KEY=
  OPENAI_API_KEY=          # optional
  SLACK_BOT_TOKEN=
  SLACK_SIGNING_SECRET=
  SLACK_APP_TOKEN=
  RESEND_API_KEY=
  UPSTASH_REDIS_REST_URL=
  UPSTASH_REDIS_REST_TOKEN=
  UPTIMEROBOT_API_KEY=
  UPTIMEROBOT_WEBHOOK_SECRET=
  SENTRY_WEBHOOK_SECRET=
  WEBHOOK_SECRET=          # generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  PORT=3001
  NODE_ENV=development
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  ```
- [ ] Create `apps/web/.env.local` and fill in ALL frontend values:
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
  CLERK_SECRET_KEY=
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  NEXT_PUBLIC_API_URL=http://localhost:3001
  ```
- [ ] Create `sentinel-agent/.env` and fill in:
  ```
  SENTINEL_WEBHOOK_URL=http://localhost:3001/api/webhooks/ingest
  WEBHOOK_SECRET=          # same as backend WEBHOOK_SECRET
  ORG_ID=                  # get from DB after seeding
  ```
- [ ] **VERIFY** `.env`, `.env.local` are in `.gitignore` (they already are)

---

## STEP 4 — Install Dependencies & Run Locally (5 mins)

- [ ] Open terminal in project root (`HackBaroda/`)
- [ ] Install all dependencies:
  ```bash
  pnpm install
  ```
- [ ] Start all services in dev mode:
  ```bash
  pnpm dev
  ```
  This starts:
  - Frontend at `http://localhost:3000`
  - Backend at `http://localhost:3001`
- [ ] Verify backend health:
  ```bash
  curl http://localhost:3001/api/health
  # Should return: {"status":"ok","timestamp":"...","version":"1.0.0"}
  ```
- [ ] Open `http://localhost:3000` in browser → should see Clerk sign-in page

---

## STEP 5 — Run Database Schema (2 mins)

> Only do this if you haven't run the schema in Step 2.1

- [ ] Run the setup script:
  ```bash
  pnpm db:setup
  ```
  OR manually paste `apps/api/src/db/schema.sql` in Supabase SQL Editor

---

## STEP 6 — Seed Demo Data (2 mins)

- [ ] First, create an org and get the org_id:
  - Sign up through the app (Clerk will create your user)
  - The app auto-creates an org → note the `org_id` from the URL or DB
- [ ] Update `ORG_ID` in `sentinel-agent/.env`
- [ ] Run seed scripts:
  ```bash
  pnpm db:seed
  ```
  This seeds:
  - 10 realistic past incidents with different sources
  - 5 runbooks with step-by-step fix procedures
  - Memories into Mem0 for each resolved incident

---

## STEP 7 — Deploy Frontend to Vercel (10 mins)

- [ ] Push code to GitHub:
  ```bash
  git add .
  git commit -m "Sentinel v1.0 — full platform"
  git push origin main
  ```
- [ ] Go to https://vercel.com → "Import Project"
- [ ] Select your GitHub repo
- [ ] Configure:
  - **Root Directory:** `apps/web`
  - **Framework Preset:** Next.js
  - **Build Command:** `cd ../.. && pnpm turbo build --filter=@sentinel/web`
  - **Install Command:** `cd ../.. && pnpm install`
- [ ] Add environment variables in Vercel dashboard:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `NEXT_PUBLIC_APP_URL` = your Vercel URL (e.g., `https://sentinel-web.vercel.app`)
  - `NEXT_PUBLIC_API_URL` = your Render backend URL
- [ ] Click **Deploy**
- [ ] Note your Vercel URL → update `NEXT_PUBLIC_APP_URL` everywhere

---

## STEP 8 — Deploy Backend to Render (10 mins)

- [ ] Go to https://render.com → "New" → "Web Service"
- [ ] Connect your GitHub repo
- [ ] Configure:
  - **Name:** `sentinel-api`
  - **Root Directory:** `apps/api`
  - **Runtime:** Node
  - **Build Command:** `cd ../.. && pnpm install && pnpm turbo build --filter=@sentinel/api`
  - **Start Command:** `node dist/index.js`
- [ ] Add ALL backend environment variables from Step 3
- [ ] Update `NEXT_PUBLIC_APP_URL` to your Vercel URL
- [ ] Click **Deploy**
- [ ] Note your Render URL (e.g., `https://sentinel-api.onrender.com`)

---

## STEP 9 — Update Webhook URLs (5 mins)

After both frontend and backend are deployed, update these:

- [ ] **Clerk:** Go to Clerk dashboard → Webhooks → update URL to:
  `https://your-render-url.onrender.com/api/webhooks/clerk`
- [ ] **Slack:** Go to Slack API dashboard → Slash Commands → update URL to:
  `https://your-render-url.onrender.com/api/slack/commands`
- [ ] **Slack Event Subscriptions:** Enable → URL:
  `https://your-render-url.onrender.com/api/slack/events`
- [ ] **UptimeRobot:** (when demo app is ready) Add monitor → webhook URL:
  `https://your-render-url.onrender.com/api/webhooks/uptimerobot`
- [ ] **Sentry:** Settings → Webhooks → URL:
  `https://your-render-url.onrender.com/api/webhooks/sentry`
- [ ] Update `apps/web/.env.local` / Vercel env var:
  `NEXT_PUBLIC_API_URL=https://your-render-url.onrender.com`
- [ ] Update `sentinel-agent/.env`:
  `SENTINEL_WEBHOOK_URL=https://your-render-url.onrender.com/api/webhooks/ingest`

---

## STEP 10 — Verify Everything Works (5 mins)

- [ ] Open your Vercel URL → sign in with Clerk → see dashboard
- [ ] Check backend health: `curl https://your-render-url.onrender.com/api/health`
- [ ] Create a manual incident from dashboard → should appear in real-time
- [ ] Check agent auto-responds → memory panel shows search results
- [ ] Check Slack → agent posted to channel
- [ ] Check ingestion health panel → sources showing status

---

## QUICK REFERENCE — All Your Keys

Keep this filled in somewhere safe (**NOT** in git):

```
SUPABASE_URL                      =
SUPABASE_SERVICE_ROLE_KEY         =
NEXT_PUBLIC_SUPABASE_ANON_KEY     =
CLERK_SECRET_KEY                  =
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY =
CLERK_WEBHOOK_SECRET              =
GROQ_API_KEY                      =
MEM0_API_KEY                      =
OPENAI_API_KEY                    =
SLACK_BOT_TOKEN                   =
SLACK_SIGNING_SECRET              =
SLACK_APP_TOKEN                   =
RESEND_API_KEY                    =
UPSTASH_REDIS_REST_URL            =
UPSTASH_REDIS_REST_TOKEN          =
UPTIMEROBOT_API_KEY               =
UPTIMEROBOT_WEBHOOK_SECRET        =
SENTRY_WEBHOOK_SECRET             =
SENTRY_DSN                        =
WEBHOOK_SECRET                    =
RENDER_BACKEND_URL                =
VERCEL_FRONTEND_URL               =
```

---

## ESTIMATED TIME

| Step | Time |
|---|---|
| Install tools | 5 mins |
| Create accounts | 30 mins |
| Fill env files | 10 mins |
| Install + run locally | 5 mins |
| Seed data | 2 mins |
| Deploy frontend (Vercel) | 10 mins |
| Deploy backend (Render) | 10 mins |
| Update webhook URLs | 5 mins |
| Verify | 5 mins |
| **Total** | **~1.5 hours** |
