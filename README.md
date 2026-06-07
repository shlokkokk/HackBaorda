# 🛡️ Sentinel — AI-Native Incident Response & Intelligent Memory Platform
> **HackBaroda 2026 Community Edition** • Track 5 (AI & Developer Tools)  
> *Sentinel is a premium, production-grade incident management co-pilot that learns from past outages to auto-triage and resolve future ones.*

---

## 📌 The Problem
Incident response is broken. When production goes down:
1. **Time to Resolution (MTTR) is High**: Engineers waste an average of **45+ minutes** digging through old Slack threads, past runbooks, and postmortems trying to answer: *"Have we seen this before? How did we fix it last time?"*
2. **Alert Fatigue**: Disparate monitoring systems (Sentry, UptimeRobot, CloudWatch, manual reports) trigger duplicate alarms simultaneously, causing alert storms and responder confusion.
3. **No Continuous Learning**: Knowledge from resolved incidents lives inside engineers' heads or gets lost in static docs. It never feeds back into the system to automate future responses.

---

## ⚡ The Sentinel Solution
Sentinel is an **AI-native incident lifecycle platform** featuring a **persistent memory layer** that learns from every resolved outage. 

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           INGESTION LAYER                                │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐     │
│  │ UptimeRobot │  │   Sentry    │  │Sentinel Agent│  │ Slack / Web │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘     │
│         │                │                │                 │            │
│         └────────────────┴───────┬────────┴─────────────────┘            │
│                                  │                                       │
│                        ┌─────────▼──────────┐                            │
│                        │  WEBHOOK ROUTER    │                            │
│                        │  • Deduplication   │                            │
│                        │  • Verification    │                            │
│                        └─────────┬──────────┘                            │
└──────────────────────────────────┼───────────────────────────────────────┘
                                   │ normalized incident
┌──────────────────────────────────▼───────────────────────────────────────┐
│                      SENTINEL CORE API (Node + Express)                  │
│                                                                          │
│    • SLA Daemon Loop               • Ingestion Health Registry           │
│    • Multi-tenant Isolation        • Event Bus Dispatcher                │
└──────────────────────────────────┬───────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────────────────────┐
│                      SENTINEL AI AGENT (LangChain)                       │
│                                                                          │
│    • LLM (Groq Qwen-32B)           • Persistent Memory (Mem0 Cloud)      │
│    • pgvector Semantic Backup      • 9 Automated Tool Connectors         │
└──────────────────────────────────────────────────────────────────────────┘
```

When an alert triggers, Sentinel detects it, normalizes it, deduplicates it, searches its long-term memory for prior solutions, suggests the fix in Slack and the dashboard, auto-escalates on SLA breaches, and drafts a complete postmortem on resolution.

---

## 🌟 Key Features

### 1. Unified Webhook Ingestion & Deduplication
- **Multi-Source Adapters**: Native, signature-verified endpoints for **Sentry**, **UptimeRobot**, **Slack Commands**, **Sentinel Agent**, and **Manual Submissions**.
- **Timing-Safe Fingerprinting**: Prevents alert fatigue. Duplicate alerts within a 10-minute window are automatically merged into a single incident with a list of historical sources.

### 2. Autonomous ReAct Agent Co-Pilot (LangChain + Groq)
- Uses Groq's high-speed **Qwen-3-32B** model orchestrated via LangChain tool-calling.
- **9 Specialized Tools**:
  1. `search_memory` — semantic search across prior incidents.
  2. `suggest_fix` — pulls exact instructions, code patches, or rollback steps.
  3. `score_severity` — assesses impact and sets triage priority.
  4. `check_sla` — checks SLA breach warnings.
  5. `notify_slack` — broadcasts thread alerts.
  6. `verify_fix` — verifies service health endpoints.
  7. `runbook_mock_executor` — safe-to-automate fix simulator.
  8. `write_memory` — writes learned rules on resolution.
  9. `generate_postmortem` — drafts markdown summaries.

### 3. Persistent Organization Memory (Mem0)
- Scoped multi-tenant memory workspace.
- Learns dynamically on resolution: *"Restart payment pod and clear redis cache"* gets extracted, vectorized, and written to Mem0. Next time a similar outage occurs, the agent presents the fix instantly.

### 4. Background SLA & Scope Escalation Daemon
- A background process checking open incidents every 60 seconds:
  - **SLA Escalation**: Auto-upgrades severity if unresolved (`P3` ➔ `P2` after 15m; `P2` ➔ `P1` after 10m; `P1` ➔ `P0` after 5m).
  - **Scope Escalation**: Dynamically bumps severity if the blast radius expands (3+ affected services ➔ `P1`; 5+ services ➔ `P0`).
  - Automatically recalculates new SLA breach times and pings incident owners on Slack.

### 5. Ingestion Health Monitoring
- Dashboard panel tracks active sources.
- Flags staleness based on source-specific heartbeats (e.g. 2m for Sentinel Host Agent, 10m for UptimeRobot).

### 6. Interactive Slack Bot & Commands
- **Thread Listener**: Reply directly in the Slack alert thread, and the bot contextually invokes the AI co-pilot, utilizing memories to recommend troubleshooting commands.
- **Slash Commands**: Manage state directly via `/sentinel new [Title]`, `/sentinel status`, `/sentinel resolve [ID]`, and `/sentinel sources`.

---

## 📁 Project Architecture

```
HackBaroda/
├── apps/
│   ├── api/                  # Node.js + Express backend service
│   │   ├── src/
│   │   │   ├── index.ts      # Server entry, starts SLA Daemon
│   │   │   ├── app.ts        # App setup, CORS, raw body middleware
│   │   │   ├── agent/        # LangChain ReAct agent loops & prompts
│   │   │   ├── db/           # Supabase PG vector client & schema
│   │   │   ├── middleware/   # Clerk, org-isolation, and signature verifications
│   │   │   └── services/     # SLA calculations, Slack, Mem0, notifications
│   ├── web/                  # Next.js 14 Command Center dashboard
│   │   ├── app/
│   │   │   ├── (dashboard)/  # Command Center dashboard, analytics, and settings
│   │   │   └── sign-in/      # Clerk login routes
│   │   └── lib/              # API wrapper helper & utility functions
│   └── demo/                 # ShopFlow — victim app for live incident demos
│       ├── app/api/health/   # UptimeRobot health endpoint
│       └── app/demo/         # Chaos engineering control panel
├── packages/
│   ├── shared/               # Shared TS interfaces, constants, and utilities
├── sentinel-agent/           # Metric collector agent for monitored hosts
└── scripts/                  # Setup validation and seed scripts
```

---

## 🛠️ Developer Setup & Commands

Sentinel is configured as a Monorepo using **Turborepo** and **pnpm**.

### 1. Prerequisites
Ensure you have Node.js 20+, pnpm, and Git installed.

### 2. Clone and Install
```bash
git clone https://github.com/shlokkokk/HackBaorda.git
cd HackBaorda
pnpm install
```

### 3. Configure Environments
Create `.env` configurations for each application (copy from `.env.example`):
- Backend configurations: `apps/api/.env`
- Frontend configurations: `apps/web/.env.local`
- Demo victim app: `apps/demo/.env.local` (optional Sentry DSN)
- Agent configurations: `sentinel-agent/.env`

### 4. Build and Validate
Check types, linting, and compile the complete monorepo bundle:
```bash
pnpm build
```

### 5. Database Setup & Seeding
Set up tables, vector indexes, and seed realistic demo incident/runbook data:
```bash
pnpm db:setup     # Verifies connection
pnpm db:seed      # Seeds 10 incidents & 5 runbooks into Supabase
pnpm setup:agent  # Auto-configures sentinel-agent ORG_ID from database
```
> Mem0 memories are written automatically when incidents are resolved via the event listener — not during seed.

### 6. Start Development Servers
Runs backend API, dashboard, host agent, and demo victim app:
```bash
pnpm dev
```
- Dashboard: `http://localhost:3000`
- Backend API: `http://localhost:3001`
- Demo App (ShopFlow): `http://localhost:3002`

Or run individually:
```bash
pnpm dev:web    # Dashboard only
pnpm dev:api    # API only
pnpm dev:demo   # ShopFlow victim app only
pnpm dev:agent  # Host metrics agent only
```

---

## 🎭 ShopFlow Demo App

The **ShopFlow** victim app (`apps/demo`) is purpose-built for live Sentinel demos. It simulates a realistic e-commerce platform with controllable failure scenarios that map to seeded incidents.

| Scenario | Trigger | Sentinel Source | Seeded Incident |
|----------|---------|-----------------|-----------------|
| Service Down | `/api/health` returns 503 | UptimeRobot | SSL Certificate Expiry warning |
| Payment Timeout | `/api/payments` returns 504 | sentinel-agent | API Gateway timeout on /payments |
| Checkout JS Error | ReferenceError on checkout | Sentry | Unhandled ReferenceError in checkout flow |
| Stripe Webhook Fail | Signature validation fails | Sentry | Stripe webhook validation failed |
| Slow Search | 12s search latency | manual | Slow response times on Search API |
| Gateway Overload | All APIs return 503 | sentinel-agent | Database connection pool exhausted |

### Demo Flow
1. Open **Chaos Panel** at `http://localhost:3002/demo`
2. Activate a failure scenario
3. Interact with the Store or Checkout pages to trigger the failure
4. Watch incidents appear in the Sentinel dashboard at `http://localhost:3000/dashboard`
5. Use the AI co-pilot — it searches Mem0 for matching past resolutions from seed data
6. Deactivate the scenario and verify recovery via `/api/health`

### External Monitoring Setup
```bash
# Set DEMO_APP_URL=http://localhost:3002 in apps/api/.env
npx tsx scripts/setup-uptimerobot.ts   # Creates UptimeRobot monitor
npx tsx scripts/setup-sentry.ts        # Sentry webhook setup guide
```

Deploy ShopFlow to Vercel and set `DEMO_APP_URL` to your production URL for remote demos.

---
