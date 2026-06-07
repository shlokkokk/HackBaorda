# Sentinel

AI-native incident response, operational memory, and live chaos-demo platform for engineering teams.

Sentinel turns fragmented production alerts into one coordinated response loop: detect the incident, deduplicate noisy signals, retrieve similar past outages, suggest the best fix, watch SLA risk, notify responders, learn from the resolution, and generate the postmortem.

Built for HackBaroda 2026, Track 5: AI and Developer Tools.

---

## The Problem

Modern incident response is still painfully manual.

When a production system breaks, teams usually lose time to the same repeated work:

- Finding whether this has happened before.
- Searching Slack, dashboards, runbooks, postmortems, and issue trackers.
- Separating real incidents from duplicate alerts.
- Guessing severity while customer impact is still changing.
- Remembering the exact fix that worked last time.
- Writing the same incident summary after everyone is already exhausted.

The result is high MTTR, noisy alert storms, lost operational knowledge, and slow onboarding for new responders.

---

## The Solution

Sentinel is an incident response command center with an AI memory layer.

It connects alerts from multiple sources, normalizes them into incidents, deduplicates related signals, and gives responders an AI co-pilot that can answer:

- "Have we seen this before?"
- "What fixed it last time?"
- "Which runbook should I use?"
- "How urgent is the SLA risk?"
- "What should I do next?"

Every resolved incident becomes reusable operational memory. The next similar outage gets a faster, more confident response.

---

## What Makes Sentinel Different

### 1. Persistent AI Memory

Sentinel does not just chat. It learns.

Resolved incidents are written into memory with:

- Root cause
- Effective fix
- Commands used
- Services affected
- Detection source
- Severity
- Time to resolve
- Lessons learned

Future incidents use this memory through Mem0 and pgvector-backed semantic retrieval.

### 2. Incident-Aware AI Agent

The AI agent receives the full current incident context plus preloaded retrieval results before responding. It can use:

- Similar past incidents
- Mem0 long-term memory
- pgvector incident search
- Matching runbooks
- SLA status
- Affected services
- Source and severity

This makes its answers specific to the incident instead of generic DevOps advice.

### 3. Runbook Retrieval

Runbooks are embedded and searched semantically. When a new incident looks like a payment timeout, Stripe webhook failure, Redis memory issue, database pool exhaustion, or checkout regression, the AI can retrieve concrete remediation steps and commands.

### 4. Multi-Source Ingestion

Sentinel supports incident creation from:

- Sentry
- UptimeRobot
- Sentinel host agent
- Slack commands
- GitHub issue webhooks
- Manual dashboard reports
- Demo webhooks

All sources flow into one normalized incident model.

### 5. Alert Deduplication

Incoming alerts are fingerprinted and merged when they describe the same underlying incident. This reduces alert fatigue and keeps responders focused on one source of truth.

### 6. SLA and Scope Escalation

Sentinel tracks SLA breach deadlines by severity and runs a background daemon that can escalate unresolved incidents as urgency increases.

Severity targets are configurable per organization:

| Severity | Meaning | Default SLA |
| --- | --- | --- |
| P0 | Critical outage | 15 minutes |
| P1 | Major customer impact | 60 minutes |
| P2 | Significant degradation | 4 hours |
| P3 | Minor degradation | 24 hours |
| P4 | Low priority | 7 days |

### 7. Postmortem Drafting

When an incident is resolved, Sentinel can generate a structured postmortem draft with summary, timeline, root cause, impact, resolution, lessons learned, and prevention actions.

### 8. Live Monitoring Agent

The Sentinel agent runs on monitored hosts and collects local system snapshots. It includes:

- Baseline learning
- Anomaly evaluation
- Alert batching
- Retry queue
- Circuit breaker
- Heartbeat reporting
- Host and collector health visibility

### 9. Real Demo Application

The repo includes ShopFlow, a demo e-commerce app with controllable failure modes. Judges can trigger realistic incidents and watch Sentinel respond in the dashboard.

---

## Demo Scenarios

ShopFlow includes realistic chaos scenarios aligned with Sentinel's training corpus.

| Scenario | What Breaks | Detection Source | AI Should Recall |
| --- | --- | --- | --- |
| Payment Timeout | `/api/payments` returns 504 | Sentinel agent | Payment retry storm, pool saturation, stuck workers |
| Duplicate Transaction Risk | Retry behavior creates charge risk | Sentry/manual | Idempotency keys and reconciliation |
| Stripe Webhook Failure | Signature validation fails | Sentry | Secret rotation and event replay |
| Gateway Overload | APIs return 503 | Sentinel agent | Database pool exhaustion mitigation |
| Checkout JS Error | Frontend checkout crash | Sentry | Rollback and token guard fix |
| Slow Search | Search latency spikes | Manual | Missing index and query tuning |
| Redis Memory Pressure | Cache reaches capacity | Sentinel agent | Eviction policy and defrag |
| SSL Expiry | Certificate warning | UptimeRobot | Cert renewal and ingress restart |

---

## AI Training Corpus

Sentinel ships with a dedicated training script for the hackathon demo:

```bash
pnpm ai:train
```

This seeds and updates:

- 10 resolved incident memories
- 7 production-style runbooks
- pgvector embeddings for incident similarity
- pgvector embeddings for runbook matching
- Mem0 memories when `MEM0_API_KEY` is configured

The script is intentionally part of the repo because it demonstrates the core product idea: Sentinel gets better as it learns operational history.

Covered domains include:

- Payment authorization timeouts
- Transaction retry storms
- Duplicate charge prevention
- Stripe webhook signature failures
- Payment worker backlogs
- Database pool exhaustion
- Gateway overload
- Checkout frontend crashes
- Search API latency
- Redis memory pressure
- Auth token parsing failures
- SSL certificate renewal

---

## Complete Feature Map

### Dashboard: Command Center

The command center is the first screen responders use during a live incident. It gives a real-time overview of operational health and keeps refreshing automatically.

- Open incidents
- Resolved incidents
- MTTR
- SLA breaches
- Recent incidents
- Ingestion source health
- Quick actions for incidents, analytics, runbooks, and the chaos panel
- Live source status for Sentry, UptimeRobot, Sentinel Agent, Slack, GitHub, and manual reports

### Incidents: Response Workspace

Responders can:

- Search and filter incidents
- Create manual incidents
- View severity, status, source, affected services, and timestamps
- Open an incident detail page
- Ask the AI co-pilot for triage or fixes
- Update incident state through the response lifecycle
- Track the incident state machine from open to investigating, mitigating, resolved, and postmortem
- Preserve root cause and resolution details for future learning

### Incident Detail: AI Co-Pilot

The agent can:

- Search memory
- Suggest a fix
- Score severity
- Check SLA status
- Retrieve runbooks
- Notify Slack
- Update status
- Write new memory
- Verify a health endpoint
- Generate a postmortem
- Explain confidence and cite retrieved incident memory or runbook context
- Use the current incident title, severity, source, services, description, and SLA deadline

### Analytics: Response Intelligence

The analytics API provides:

- Incident totals
- Open and resolved counts
- MTTR
- SLA breach counts
- Severity breakdown
- Source breakdown
- MTTR trend
- Incident heatmap
- Agent memory count
- Day-by-hour incident patterns
- Visual response-performance cards

### Runbooks: Automation Library

Runbooks are stored per organization and can be searched semantically by the AI agent. Each runbook can define:

- Incident type
- Ordered steps
- Commands
- Automation safety
- Confidence threshold
- Search by title or incident type
- Expandable step-by-step procedures
- Manual-only and safe-to-automate modes
- Creation UI for custom operational playbooks

### Postmortems: Learning Archive

Postmortems are generated and managed inside the dashboard.

- Automatic draft creation when incidents are resolved
- Searchable postmortem archive
- Draft, in-review, and published states
- Markdown-style incident report rendering
- Print or export flow for sharing reports
- Timeline, impact, root cause, resolution, lessons, and prevention sections

### Agent Fleet: Host Monitoring

Sentinel shows the status of every connected host agent.

The fleet page shows host-agent health:

- Hostname and agent ID
- Platform and architecture
- Last heartbeat
- Active and failed collectors
- Baseline learning status
- Circuit breaker state
- Auto-discovered services
- IP addresses
- Agent version
- Healthy, degraded, stale, and offline states
- Collector-level visibility for debugging monitoring gaps

### On-Call: Escalation Routing

The on-call page helps teams route incidents to the right responder.

- Active responder panel
- On-call roster
- Toggle users on or off duty
- Responder roles
- Slack identity awareness
- Weekly rotation-style schedule view
- Empty-state warning when nobody is on call

### Settings: Workspace Control

The settings page configures organization-level behavior.

- Workspace profile
- Slack workspace ID
- SLA policy per severity
- Webhook integration URLs
- Organization ingestion secret
- Copy-ready endpoints for monitoring providers
- UptimeRobot, Sentry, GitHub, and Sentinel Agent webhook setup

### ShopFlow Demo: Live Failure Simulator

ShopFlow is the live victim app. It lets judges trigger incidents instead of only reading seeded data.

Routes include:

- Storefront
- Checkout
- Health endpoint
- Payments endpoint
- Search endpoint
- Stripe webhook endpoint
- Chaos control panel

### Sentinel Agent: Infrastructure Watcher

The local host agent provides infrastructure telemetry and incident signals.

- System snapshot collection
- Baseline learner
- Anomaly alert engine
- Batch sender
- Retry queue
- Circuit breaker
- Heartbeat sender
- Graceful shutdown
- Collector health tracking

### Backend Platform

The API is the operational core of Sentinel.

- Express server with security middleware
- Clerk auth and organization isolation
- Incident CRUD
- State transition validation
- Deduplication and fingerprinting
- SLA calculation and daemon escalation
- Webhook routing
- Ingestion health registry
- Analytics routes
- Runbook routes
- Postmortem routes
- Agent query routes
- Event bus listeners for auto-triage and learning

### Webhook Integrations

Sentinel accepts signals from multiple operational systems.

- Sentry issue alerts
- UptimeRobot uptime alerts
- GitHub issue webhooks
- Slack commands and thread interactions
- Sentinel Agent ingest
- Demo app webhooks
- Manual reports from the dashboard

---

## Architecture

```text
HackBaroda/
  apps/
    api/              Express API, AI agent, webhooks, SLA daemon, Supabase access
    web/              Next.js command center dashboard
    demo/             ShopFlow demo app with controllable failures
  packages/
    shared/           Shared TypeScript types, constants, validation, utilities
  sentinel-agent/     Host monitoring agent with baseline learning and alert pipeline
  scripts/            Setup, seed, and AI training scripts
```

High-level flow:

```text
Monitoring source
  -> webhook adapter
  -> normalized incident
  -> deduplication
  -> Supabase incident store
  -> event bus
  -> AI auto-triage
  -> memory/runbook retrieval
  -> Slack/dashboard response
  -> resolution learning
  -> postmortem draft
```

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Monorepo | pnpm workspaces, Turborepo |
| API | Node.js, Express, TypeScript |
| Dashboard | Next.js, React, Tailwind CSS, Clerk |
| Demo App | Next.js, Sentry-ready instrumentation |
| AI | LangChain, Groq, Mem0 |
| Memory Search | Supabase Postgres, pgvector |
| Database | Supabase |
| Auth | Clerk |
| Notifications | Slack Bot API |
| Monitoring | UptimeRobot, Sentry, custom Sentinel agent |
| Validation | Zod |
| Logging | Pino |

---

## Core API Surface

| Area | Endpoint |
| --- | --- |
| Health | `GET /api/health` |
| Incidents | `/api/incidents` |
| Agent query | `POST /api/agent/query` |
| Agent memory stats | `GET /api/agent/memory/stats` |
| Agent fleet | `GET /api/agent/hosts` |
| Analytics | `/api/analytics/*` |
| Ingestion health | `GET /api/ingestion/health` |
| Runbooks | `/api/runbooks` |
| Postmortems | `/api/postmortems` |
| Webhooks | `/api/webhooks/*` |

---

## Setup

### 1. Install

```bash
pnpm install
```

### 2. Configure Environment

Copy `.env.example` values into the relevant service files:

```text
apps/api/.env
apps/web/.env.local
apps/demo/.env.local
sentinel-agent/.env
```

Required for the full demo:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLERK_SECRET_KEY`
- `GROQ_API_KEY`
- `MEM0_API_KEY`

Optional integrations:

- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET`
- `SENTRY_WEBHOOK_SECRET`
- `UPTIMEROBOT_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

### 3. Set Up Database

Run the SQL in:

```text
apps/api/src/db/schema.sql
```

Then verify the database connection:

```bash
pnpm db:setup
```

### 4. Seed Demo Data and Train AI

```bash
pnpm db:seed
```

This runs:

```bash
tsx scripts/seed-incidents.ts
tsx scripts/seed-runbooks.ts
tsx scripts/train-ai-demo.ts
```

You can rerun only the AI corpus training with:

```bash
pnpm ai:train
```

### 5. Start Everything

```bash
pnpm dev
```

Local services:

| Service | URL |
| --- | --- |
| Dashboard | `http://localhost:3000` |
| API | `http://localhost:3001` |
| ShopFlow Demo | `http://localhost:3002` |

Individual commands:

```bash
pnpm dev:web
pnpm dev:api
pnpm dev:demo
pnpm dev:agent
```

---

## Demo Script for Judges

1. Open the dashboard at `http://localhost:3000/dashboard`.
2. Open ShopFlow chaos panel at `http://localhost:3002/demo`.
3. Activate `Payment Timeout`.
4. Trigger checkout or call the payments endpoint.
5. Watch Sentinel create or surface the incident.
6. Open the incident detail page.
7. Ask the AI: `What is the likely fix and what runbook should I follow?`
8. The AI should retrieve payment timeout memory and runbook steps.
9. Resolve the incident with root cause and resolution.
10. Sentinel writes learnings and prepares postmortem context.

Recommended demo questions:

```text
Have we seen this payment timeout before?
What is the fastest safe mitigation?
Which commands should the on-call engineer run?
Is this an SLA risk?
What should we write in the postmortem?
```

---

## Why This Matters

Sentinel reduces the time between "something broke" and "we know what to do."

For engineering teams, that means:

- Lower MTTR
- Less alert fatigue
- Faster onboarding for new responders
- Better reuse of incident knowledge
- More reliable postmortems
- Stronger operational memory over time

Most incident tools store tickets. Sentinel stores learning.

---

## Verification

The project currently passes TypeScript checks:

```bash
pnpm typecheck
```

The AI training command has also been run successfully:

```bash
pnpm ai:train
```

---

## Repository Hygiene

Ignored local-only files include:

- Dependency folders
- Build output
- Turborepo cache
- Next.js output
- Environment files
- Agent runtime data
- Test reports
- Logs
- Internal planning documents
- Temporary files

The AI training script is intentionally tracked because it is part of the demo and product story.

---

## Team Pitch

Sentinel is an AI-powered incident response memory platform. It watches production signals, turns noisy alerts into one clean incident, retrieves the exact fixes that worked before, helps responders act faster, and learns from every resolution.

It is not just another dashboard. It is the operational memory layer for modern engineering teams.
