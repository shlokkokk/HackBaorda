<div align="center">

```
███████╗███████╗███╗   ██╗████████╗██╗███╗   ██╗███████╗██╗
██╔════╝██╔════╝████╗  ██║╚══██╔══╝██║████╗  ██║██╔════╝██║
███████╗█████╗  ██╔██╗ ██║   ██║   ██║██╔██╗ ██║█████╗  ██║
╚════██║██╔══╝  ██║╚██╗██║   ██║   ██║██║╚██╗██║██╔══╝  ██║
███████║███████╗██║ ╚████║   ██║   ██║██║ ╚████║███████╗███████╗
╚══════╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝
```

### **AI-Native Incident Response & Operational Memory Platform**

*Detect → Deduplicate → Triage → Recall → Resolve → Learn. Repeat.*

---

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-404D59?style=for-the-badge&logo=express&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Groq](https://img.shields.io/badge/Groq_LLM-F55036?style=for-the-badge&logo=groq&logoColor=white)
![Slack](https://img.shields.io/badge/Slack-4A154B?style=for-the-badge&logo=slack&logoColor=white)

**Built for [HackBaroda 2026](https://hackbaroda.com) · Track 5: AI and Developer Tools**

</div>

---

## 🧭 Table of Contents

- [The Problem](#-the-problem)
- [What is Sentinel?](#-what-is-sentinel)
- [Core Platform Features](#-core-platform-features)
- [The AI Agent: 10 Specialized Tools](#-the-ai-agent-10-specialized-tools)
- [SLA Auto-Escalation Daemon](#-sla-auto-escalation-daemon)
- [Dual-Layer Memory Architecture](#-dual-layer-memory-architecture)
- [Multi-Source Ingestion](#-multi-source-ingestion)
- [Dashboard: Every Tab Explained](#-dashboard-every-tab-explained)
- [ShopFlow: Live Chaos Demo](#-shopflow-live-chaos-demo)
- [Sentinel Host Agent](#-sentinel-host-agent)
- [Architecture Deep Dive](#-architecture-deep-dive)
- [Tech Stack](#-tech-stack)
- [API Surface](#-api-surface)
- [Setup & Installation](#-setup--installation)
- [Demo Playbook for Judges](#-demo-playbook-for-judges)

---

## 🔥 The Problem

When production breaks, engineering teams don't lose time *fixing* the issue — they lose time *finding context*.

> *"Did we see this payment timeout before?"*
> *"Which runbook handles Redis pressure?"*
> *"Is this a duplicate of the Sentry alert?"*
> *"Who is on-call right now?"*
> *"Are we about to breach the P1 SLA?"*

The result is sky-high MTTR, alert storms, burned-out engineers, and the same postmortem written over and over.

**The tools that exist today store tickets. They don't store knowledge.**

---

## 💡 What is Sentinel?

Sentinel is an **AI-native incident command center** that wraps a persistent operational memory layer around your entire incident lifecycle.

Every resolved incident is embedded into a dual-layer vector database (Mem0 + pgvector). When the next incident fires, the AI Agent instantly retrieves *exactly* what happened last time, *exactly* what the fix was, and *exactly* which runbook to run — before the responder even types a question.

```
Alert Fires  →  Deduplicate  →  Auto-Triage AI  →  Slack Alert
                                      ↓
                          Memory Retrieval (Mem0 + pgvector)
                                      ↓
                          Responder opens Incident Detail
                                      ↓
                     AI Co-Pilot: "Here's what happened before"
                                "Here's the runbook"
                                "Here's the exact command"
                                      ↓
                          SLA Daemon watches the countdown
                                      ↓
                     Resolved → Learnings written to memory
                                      ↓
                          Postmortem auto-drafted
```

**Sentinel doesn't just respond to incidents. It gets smarter with every one.**

---

## 🎯 Core Platform Features

| Feature | Description |
|---|---|
| 🧠 **Persistent AI Memory** | Dual-layer vector store (Mem0 + pgvector) embeds every resolution |
| 🔔 **Multi-Source Ingestion** | Sentry, UptimeRobot, GitHub, Sentinel Agent, Slack, Manual |
| 🤖 **10-Tool AI Agent** | LangChain + Groq with parallel memory prefetch |
| ⏰ **SLA Auto-Escalation** | Background daemon escalates P3→P2→P1→P0 automatically |
| 🔁 **Alert Deduplication** | Fingerprinting merges duplicate signals across sources |
| 📖 **Runbook Retrieval** | Semantic search matches incidents to relevant playbooks |
| 📊 **Response Analytics** | MTTR trends, incident heatmaps, severity breakdowns |
| 📋 **Auto Postmortems** | AI generates structured postmortem drafts on resolution |
| 👥 **On-Call Routing** | Roster management with Slack identity and shift schedules |
| 🖥️ **Host Agent** | Baseline learning + anomaly detection + circuit breaker |

---

## 🤖 The AI Agent: 10 Specialized Tools

The heart of Sentinel is a **LangChain-orchestrated AI agent** powered by **Groq's Llama 3** model. The agent uses parallel `Promise.all()` prefetching across Mem0, pgvector, and runbook search so it has full context before Groq even sees the query — total response time: **3–8 seconds**.

Every query is grounded in the live incident's full context: `title`, `severity`, `status`, `source`, `affected_services`, `description`, and `sla_breach_at`.

### Tool Registry

| # | Tool Name | What It Does |
|---|---|---|
| 1 | `search_memory` | Parallel search across Mem0 AND pgvector incidents AND runbooks simultaneously |
| 2 | `score_severity` | Dynamic severity scoring using keyword analysis + service criticality + time-of-day factors |
| 3 | `suggest_fix` | Returns confidence-ranked fix with commands from similar past incidents; auto vs manual mode |
| 4 | `escalate_incident` | Looks up on-call roster, assigns incident, triggers notification |
| 5 | `generate_postmortem` | Creates a structured Markdown postmortem draft and persists it to Supabase |
| 6 | `notify_slack` | Sends targeted Slack message to configured channel with incident context |
| 7 | `update_status` | Validates and executes state transitions: `open → investigating → mitigating → resolved → postmortem` |
| 8 | `write_memory` | Embeds resolution learnings into Mem0 + pgvector for future retrieval |
| 9 | `check_sla` | Returns real-time SLA status: remaining time, breach percentage, breach flag |
| 10 | `verify_fix` | HTTP health check against a live endpoint to confirm the fix worked |

### How the Agent Orchestrator Works

```typescript
// From orchestrator.ts — parallel prefetch before every LLM call
const [memories, pgResults, runbooks] = await Promise.all([
  searchMemories(query, orgId, 5),        // Mem0 semantic search
  searchSimilarIncidents(query, orgId, 5), // pgvector cosine similarity
  searchSimilarRunbooks(query, orgId, 3),  // Runbook embedding search
]);

// All results injected into the system prompt:
// "Pre-loaded Context (already fetched — answer directly, do NOT request more data)"
const systemText = buildSystemPrompt(incident, memoryBlock, slaBlock);
const response = await groq.invoke([new SystemMessage(systemText), new HumanMessage(query)]);
```

The agent scores and cites every retrieved memory:
```
[Mem0 92%]     Payment timeout root cause: saturated connection pool...
[pgvector 87%] "Database Pool Exhaustion" — Root: max_connections hit, Fix: restart pgbouncer
[Runbook 81%]  "DB Pool Recovery" — Steps: 1. Check pg_stat_activity 2. Kill idle connections...
```

### Suggested AI Prompts (Built into the UI)

```
"What caused similar issues before?"
"Suggest a fix"
"Check SLA status"
"Score the severity"
"Which commands should I run?"
"Generate the postmortem"
"Is this a duplicate alert?"
```

---

## ⏰ SLA Auto-Escalation Daemon

Sentinel runs a **background polling daemon** every 60 seconds that enforces two types of automatic escalation — no human needed.

### Escalation Rules

#### Rule A — Time-Based SLA Escalation
| Current Severity | Time Open | Auto-Escalates To |
|---|---|---|
| P3 | ≥ 15 minutes | **P2** |
| P2 | ≥ 10 minutes | **P1** |
| P1 | ≥ 5 minutes | **P0** |

#### Rule B — Scope-Based Escalation
| Affected Services | Auto-Escalates To |
|---|---|
| ≥ 3 services | **P1** |
| ≥ 5 services | **P0** |

### On Escalation, the daemon automatically:
1. Updates severity and recalculates `sla_breach_at` using the org's custom SLA config
2. Stamps a `severity_changed_at:` tag on the incident for accurate elapsed-time tracking
3. Emits an `incident.severity_changed` event on the internal event bus
4. Posts a Slack notification to the configured channel with a deep-link to the incident

```typescript
// From slaDaemon.ts
if (inc.severity === 'P2' && elapsedMins >= 10) {
  targetSeverity = 'P1';
  reason = `SLA threshold breached (P2 open for ${Math.floor(elapsedMins)}m, limit 10m)`;
}
// → Updates DB, fires event bus, notifies Slack thread
```

---

## 🧠 Dual-Layer Memory Architecture

Sentinel's AI memory is not a simple chat history. It is a **production-grade episodic memory system** combining two complementary retrieval mechanisms.

```
On Incident Resolution:
┌──────────────────────────────────────────────────────────┐
│  write_memory tool captures:                             │
│  · Root cause       · Effective fix    · Commands used   │
│  · Severity          · Source           · Lessons learned │
│  · Affected services · Time to resolve  · SLA breached?  │
└──────────────┬───────────────────────┬───────────────────┘
               ↓                       ↓
      ┌──────────────┐        ┌──────────────────┐
      │    Mem0 API  │        │  Supabase pgvector│
      │  (Long-term) │        │  (Cosine search) │
      │  Semantic +  │        │  Incident table  │
      │  Episodic    │        │  embedding col   │
      └──────────────┘        └──────────────────┘

On Next Incident Query — Both searched in parallel:
  Mem0 → "You resolved a similar P1 payment timeout 3 weeks ago..."
  pgvector → "Past incident 'DB Pool Exhaustion' (87% match) — Fix: restart pgbouncer"
  Runbooks → "Database Pool Recovery playbook (81% match) — 5 steps"
```

### What Gets Stored Per Memory
```typescript
{
  incident_id, title, affected_services, root_cause,
  effective_fix,     // The exact fix that worked
  severity, source, tags, lessons_learned,
  root_cause_category, symptoms, commands_used,
  time_to_detect_mins, time_to_resolve_mins,
  sla_breached, postmortem_id, detection_sources
}
```

### AI Training Corpus
Run `pnpm ai:train` to pre-seed the memory with **10 production-grade incident memories** and **7 runbooks** covering:

| Domain | Scenarios |
|---|---|
| Payments | Authorization timeouts, retry storms, duplicate charges, Stripe webhook failures, worker backlogs |
| Infrastructure | DB pool exhaustion, gateway overload, Redis memory pressure |
| Frontend | Checkout JS crashes, auth token parsing failures |
| Security/Ops | SSL certificate expiry, ingress restart procedures |

---

## 📡 Multi-Source Ingestion

Sentinel normalizes alerts from every major monitoring tool into a single incident model.

```
┌─────────────┐  ┌──────────────┐  ┌───────────┐  ┌─────────────┐
│   Sentry    │  │ UptimeRobot  │  │  GitHub   │  │    Slack    │
│  (Errors)   │  │  (Uptime)    │  │  (Issues) │  │  (Commands) │
└──────┬──────┘  └──────┬───────┘  └─────┬─────┘  └──────┬──────┘
       │                │                │                │
       └────────────────┴────────────────┴────────────────┘
                                 ↓
                    POST /api/webhooks/{source}
                                 ↓
                    ┌────────────────────────┐
                    │   Webhook Adapter      │
                    │   + Fingerprinting     │
                    │   + Deduplication      │
                    └────────────┬───────────┘
                                 ↓
                    ┌────────────────────────┐
                    │   Supabase Incident    │
                    │      Store             │
                    └────────────┬───────────┘
                                 ↓
                    ┌────────────────────────┐
                    │      Event Bus         │
                    │   incident.created     │
                    └────────────┬───────────┘
                                 ↓
                    ┌────────────────────────┐
                    │   AI Auto-Triage       │
                    │   + Slack Alert        │
                    └────────────────────────┘
```

### Supported Sources

| Source | Webhook Path | What It Captures |
|---|---|---|
| **Sentry** | `POST /api/webhooks/sentry` | Exceptions, errors, regressions |
| **UptimeRobot** | `POST /api/webhooks/uptimerobot` | Uptime alerts, SSL warnings |
| **GitHub** | `POST /api/webhooks/github` | Labeled issues converted to incidents |
| **Slack** | Bolt app integration | `/sentinel` slash commands, interactive alerts |
| **Sentinel Agent** | `POST /api/webhooks/ingest` | Host metrics, anomaly alerts, heartbeats |
| **ShopFlow Demo** | `POST /api/webhooks/demo` | Controlled chaos scenario signals |
| **Manual** | Dashboard UI | Responder-created incidents |

---

## 🖥️ Dashboard: Every Tab Explained

### 🎛️ Command Center (`/dashboard`)

The war room. Auto-refreshes every **10 seconds**.

- **4 KPI Cards:** Open Incidents · MTTR · Resolved · SLA Breaches — all live
- **Recent Incidents Feed:** Last 5 incidents with one-click deep links
- **Quick Actions Panel:** Incidents · Analytics · Runbooks · Chaos Panel
- **Ingestion Source Grid:** 6 sources (Sentinel Agent, Sentry, UptimeRobot, Slack, GitHub, Manual) with colored health dots showing `healthy / stale / unhealthy` and last-ping time
- **Direct link** to ShopFlow chaos panel in the header

---

### 🚨 Incidents (`/dashboard/incidents`)

The response workspace for active incidents. **Polls every 8 seconds.**

- **Real-time count** with live badge
- **Search bar** with 300ms debounce against title, description, services
- **Status filter:** All / Open / Investigating / Mitigating / Resolved / Postmortem
- **Severity filter:** P0 through P4
- **Incident rows** show: color-coded severity pill · title · source icon badge · time-ago · affected services · status badge
- **Report Incident button** opens an inline form with title + severity selector
- **Auto-creates** incidents with full Clerk org isolation

---

### 🔍 Incident Detail (`/dashboard/incidents/[id]`)

The full AI-powered workspace per incident.

**Left Column — Main Workspace:**
- Incident header: severity pill · status pill · source badge · title · creation time · affected services
- Status transition buttons: respects the state machine (`open → investigating → mitigating → resolved → postmortem`)
- **AI Chat Panel** (400px scrollable, auto-scroll to latest)
  - Suggested prompt chips: `"What caused similar issues before?"` · `"Suggest a fix"` · `"Check SLA status"` · `"Score the severity"`
  - User messages (right-aligned, primary bubble)
  - AI responses rendered as **full styled ReactMarkdown** (headings, code blocks, lists, blockquotes, inline code, links)
  - Tool usage badges shown below each AI response (e.g. `search_memory`)
  - Loading state: `Querying Groq (usually 3–10s)...` with spinner

**Right Column — Sidebar:**
- **SLA Countdown Tracker:** Live progress bar · time remaining in `Xh Ym` format · turns red + glows when < 10 minutes
- **Details Panel:** Source · Affected Services · Created At · Resolved At · Tags
- **Linked Memories Panel:** Shows all Mem0 memory IDs written for this incident (memory IDs that future queries will retrieve)

---

### 📊 Analytics (`/dashboard/analytics`)

Response intelligence over time.

| Widget | Details |
|---|---|
| Average MTTR | Minutes across all resolved incidents |
| SLA Compliance | `100% - breach_count` formatted as percentage |
| Agent Memories | Live count of memories stored in the AI brain |
| MTTR Trend Chart | Animated bar chart for last 30 days, hover shows exact minutes + date |
| Incident Heatmap | 7-day × 24-hour matrix showing incident density by day and hour with red intensity scaling |

---

### 📖 Runbooks (`/dashboard/runbooks`)

AI-retrievable step-by-step playbooks.

- **Searchable** by title and incident type (real-time filter)
- **Create Runbook modal** with:
  - Title + Incident Trigger Type selector (Deployment Error, Resource Exhaustion, Network Degradation, DB Lock, SSL Expiry, Security Violation)
  - **Safe to Automate** toggle (enables AI Mode 3 — autonomous execution)
  - **Confidence Threshold** slider (50%–100%) — AI only auto-runs if match exceeds this
  - Dynamic step builder: Name · Description · Command (all editable inline)
- **Runbook cards** show: incident type badge · title · safe/manual badge · threshold · step count
- **Expandable step view** reveals full numbered sequence with syntax-highlighted command blocks
- Runbooks are **semantically embedded** — the AI retrieves them by vector similarity

---

### 📋 Postmortems (`/dashboard/postmortems`)

The organizational learning archive.

- **Searchable** by incident title and postmortem content
- **Status workflow:** `Draft → In Review → Published` (editable via dropdown)
- **Click any row** → full-width right **slideover panel** animates in
- Slideover shows: postmortem metadata · status selector · **rendered Markdown** (headings, bullets, blockquotes, all styled)
- **Print / Export PDF** button for sharing reports
- Auto-generated structure includes: Summary · Timeline · Root Cause · Impact · Resolution · Lessons Learned · Prevention Actions
- Postmortems are auto-drafted when `generate_postmortem` tool is invoked by AI

---

### 💻 Agent Fleet (`/dashboard/agents`)

Infrastructure host monitoring visibility.

Per connected host:
| Field | Details |
|---|---|
| Hostname + Host ID | Full identifier with mono badge |
| OS + Architecture | Platform string + arch (e.g. `linux x64`) |
| Agent Version | Semver string |
| Status Badge | `Healthy / Degraded / Stale / Offline` with animated circuit breaker indicator |
| Circuit Breaker | `CLOSED / OPEN / HALF_OPEN` — OPEN state pulses red |
| Metric Collectors | Green badges for active · pulsing red for failed collectors |
| Baseline Learning | Status + learned horizon in hours + progress bar (full at 24h) |
| Auto-Discovered Services | Service name · type · port · status for each detected process |
| IP Addresses | All bound IPs |
| Last Heartbeat | Time-ago string |

---

### 👥 On-Call (`/dashboard/on-call`)

Escalation routing and responder management.

- **Active Responder Panel:** Shows current on-duty engineer with email + Slack identity badge
- **Warning state:** Full-width red alert when no one is on-call ("Incidents will have no auto-assignee")
- **Rotation schedule:** Day-of-week grid showing weekly assignment based on roster
- **Fleet cards:** Every org member shown with role badge, on-call status, "Go On-Call / Take Off-Call" toggle
- Rotation info: *"Automatic rotation shifts trigger on Mondays at 08:00 AM local time"*
- Toggling on-call status immediately updates Supabase and reflects in the `escalate_incident` AI tool

---

### ⚙️ Settings (`/dashboard/settings`)

Three-tab organization configuration panel.

**General Tab:**
- Organization name editor
- Slack Workspace ID input (used by Bot for channel routing)

**SLA Policies Tab:**
- Per-severity SLA target editor (in minutes) for P0 through P4
- Changes feed directly into SLA daemon escalation logic

**Webhook Integrations Tab:**
- Organization ingestion secret (SHA256 HMAC for request validation) with one-click copy
- Ready-to-paste webhook URLs for: UptimeRobot · Sentry · GitHub · Sentinel Agent
- Each URL auto-populated with `NEXT_PUBLIC_API_URL`

---

## 🛒 ShopFlow: Live Chaos Demo

ShopFlow is a **fully functioning e-commerce app** built exclusively to let judges trigger realistic incidents without seeded fake data.

### Application Routes
| Route | Description |
|---|---|
| `/` | Product storefront with cart and product listings |
| `/checkout` | Full payment checkout flow |
| `/demo` | **Chaos Control Panel** — the incident trigger board |
| `/api/payments` | Payment processing endpoint (target of chaos) |
| `/api/search` | Product search endpoint (latency injection target) |
| `/api/health` | Service health check endpoint |
| `/api/webhooks/stripe` | Stripe webhook simulation endpoint |

### Chaos Scenarios

| Scenario | Service Affected | Detection Source | AI Memory Match |
|---|---|---|---|
| 💳 **Payment Timeout** | `/api/payments` → 504 | Sentinel Agent | Pool saturation, retry storm, stuck workers |
| 🔁 **Duplicate Transaction** | Checkout retry logic | Sentry / Manual | Idempotency keys, charge reconciliation |
| 🔑 **Stripe Webhook Failure** | Signature validation | Sentry | Secret rotation, event replay |
| 🔥 **Gateway Overload** | All APIs → 503 | Sentinel Agent | DB pool exhaustion, pgbouncer restart |
| 💥 **Checkout JS Error** | Frontend crash | Sentry | Rollback, auth token guard |
| 🐢 **Slow Search** | `/api/search` latency spike | Manual | Missing index, query tuning |
| 🧱 **Redis Memory Pressure** | Cache at capacity | Sentinel Agent | Eviction policy, defrag |
| 🔒 **SSL Certificate Expiry** | HTTPS warning | UptimeRobot | Cert renewal, ingress restart |

**Instrumented with Sentry SDK** — errors auto-flow as webhook events to Sentinel.

---

## 🖥️ Sentinel Host Agent

A lightweight **Node.js daemon** that runs on monitored infrastructure.

### Internal Architecture

```
Main Loop (configurable interval)
  ↓
captureSystemSnapshot()           ← Collectors run in parallel
  ├── CPU collector
  ├── Memory collector
  ├── Disk collector
  ├── Process collector
  └── Network collector
  ↓
AlertEngine.evaluate(snapshot)    ← Compares vs learned baseline
  ↓
alertsToSend → BatchSender.enqueue()
  ↓
RetryQueue.getReadyAlerts()       ← Circuit breaker gate
  ↓
BatchSender.sendSingleAlert()     ← POST /api/webhooks/ingest
  ↓
HeartbeatSender.send(snapshot)    ← 10% of cycles send full heartbeat
```

### Resilience Features

| Feature | Behavior |
|---|---|
| **Baseline Learner** | Learns normal CPU/memory/disk over 24 hours; prevents false positives |
| **Circuit Breaker** | `CLOSED → OPEN → HALF_OPEN`; stops sending alerts when API is unreachable |
| **Retry Queue** | Failed alerts re-queued with backoff; flushed on graceful shutdown |
| **Batch Sender** | Coalesces multiple alerts into single API calls |
| **Graceful Shutdown** | `SIGINT / SIGTERM` handlers flush queue and confirm shutdown |
| **Auto-Discovery** | Scans running processes and open ports to identify active services |

---

## 🏗️ Architecture Deep Dive

### Monorepo Structure

```
sentinel/
├── apps/
│   ├── api/                    Express.js backend
│   │   └── src/
│   │       ├── agent/          AI orchestrator + 10 LangChain tools + system prompts
│   │       ├── db/             Supabase client + schema.sql
│   │       ├── lib/            Config, logger (Pino), middleware
│   │       ├── routes/         incidents, analytics, runbooks, postmortems, webhooks...
│   │       └── services/       mem0, embeddings, slack, sla, slaDaemon, events
│   │
│   ├── web/                    Next.js 14 dashboard
│   │   └── app/
│   │       ├── (dashboard)/    Authenticated layout + all 8 dashboard pages
│   │       ├── components/     UI components (LiveBadge, ErrorBanner, EmptyState...)
│   │       └── lib/            API client, hooks (usePolling), utils
│   │
│   └── demo/                   ShopFlow e-commerce app
│       └── app/
│           ├── api/            payments, search, health, stripe webhook
│           ├── checkout/       Checkout UI
│           └── demo/           Chaos Control Panel
│
├── packages/
│   └── shared/                 TypeScript types, Zod schemas, constants
│       └── src/
│           ├── types/          Incident, Runbook, Postmortem, AgentInteraction...
│           └── constants/      SEVERITY_CONFIG, STATUS_CONFIG, SOURCE_CONFIG, STATUS_TRANSITIONS
│
├── sentinel-agent/             Node.js host monitoring daemon
│   └── src/
│       ├── baseline/           BaselineLearner
│       ├── collectors/         CPU, Memory, Disk, Network, Process
│       ├── engine/             AlertEngine (anomaly scoring)
│       ├── health/             HeartbeatSender
│       └── pipeline/           CircuitBreaker, RetryQueue, BatchSender
│
└── scripts/                    Setup, seed, and AI training scripts
    ├── setup-db.ts             Schema + pgvector extension verification
    ├── seed-incidents.ts       10 resolved incidents with embeddings
    ├── seed-runbooks.ts        7 production-style runbooks with embeddings
    └── train-ai-demo.ts        Mem0 + pgvector training corpus
```

### Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    MONITORING SOURCES                     │
│  Sentry · UptimeRobot · GitHub · Agent · Slack · Manual  │
└─────────────────────────┬───────────────────────────────┘
                           │ Webhook POST
                           ↓
┌─────────────────────────────────────────────────────────┐
│                     EXPRESS API                           │
│  · HMAC signature verification                           │
│  · Fingerprint deduplication                             │
│  · Incident normalization → Supabase write               │
│  · Event bus: incident.created                           │
└──────┬──────────────────────────────────┬───────────────┘
       │                                  │
       ↓                                  ↓
┌──────────────┐                 ┌──────────────────────┐
│  SLA Daemon  │                 │   Auto-Triage Agent   │
│  (60s poll)  │                 │   Groq LLM + 3-way    │
│  P3→P2→P1→P0 │                 │   parallel prefetch   │
└──────┬───────┘                 └──────────┬───────────┘
       │                                    │
       ↓                                    ↓
┌─────────────────────────────────────────────────────────┐
│                    SUPABASE                              │
│  PostgreSQL · pgvector · Realtime subscriptions          │
│  incidents · runbooks · postmortems · agent_interactions │
│  users · organizations · ingestion_health · hosts        │
└──────────────────────────┬──────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────┐
│               NEXT.JS DASHBOARD                          │
│  Clerk-authenticated · polls every 8–10s                │
│  8 pages · Framer Motion · ReactMarkdown · Recharts      │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Monorepo** | pnpm workspaces + Turborepo | Unified dependency management, parallel builds |
| **API** | Node.js 20, Express, TypeScript | REST server, middleware, org isolation |
| **Dashboard** | Next.js 14, React, Tailwind CSS | Glassmorphic UI, SSR, Clerk-gated routes |
| **Auth** | Clerk | Multi-org auth, JWT, user sync via webhooks |
| **AI Inference** | Groq (llama-3.1-8b-instant) | Sub-second LLM responses, 0.2 temperature |
| **AI Orchestration** | LangChain (JS) | Tool routing, system prompt injection |
| **Memory (episodic)** | Mem0 API | Long-term semantic memory with score metadata |
| **Memory (search)** | Supabase pgvector | Cosine similarity search across embeddings |
| **Database** | Supabase PostgreSQL | All persistent data, RLS, Realtime |
| **Cache / Rate Limit** | Upstash Redis | Request rate limiting, ephemeral caching |
| **Notifications** | Slack Bolt SDK | Bot alerts, slash commands, thread replies |
| **Error Tracking** | Sentry (demo app) | Exception capture → webhook → Sentinel |
| **Uptime Monitoring** | UptimeRobot | HTTP monitor alerts → webhook → Sentinel |
| **Email** | Resend | Transactional email notifications |
| **Validation** | Zod | Schema validation on all inputs |
| **Logging** | Pino | Structured JSON logs with service tagging |
| **UI Animation** | Framer Motion | Staggered list animations, slide panels |

---

## 📡 API Surface

### Core Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Server heartbeat |
| `GET` | `/api/incidents` | List incidents (filter by status, severity, search) |
| `POST` | `/api/incidents` | Create incident |
| `GET` | `/api/incidents/:id` | Get incident + interaction history |
| `PATCH` | `/api/incidents/:id` | Update incident (status, severity, tags...) |
| `POST` | `/api/agent/query` | Run AI agent query against an incident |
| `GET` | `/api/agent/memory/stats` | Memory count from Mem0 |
| `GET` | `/api/agent/hosts` | Agent fleet list with health metadata |
| `GET` | `/api/analytics/overview` | KPI stats (MTTR, breaches, totals) |
| `GET` | `/api/analytics/heatmap` | 7×24 incident frequency matrix |
| `GET` | `/api/analytics/mttr-trend` | 30-day MTTR time series |
| `GET` | `/api/ingestion/health` | Source health registry (last ping times) |
| `GET` | `/api/runbooks` | List runbooks |
| `POST` | `/api/runbooks` | Create runbook |
| `DELETE` | `/api/runbooks/:id` | Delete runbook |
| `GET` | `/api/postmortems` | List postmortems with incident join |
| `PATCH` | `/api/postmortems/:id` | Update postmortem status |
| `POST` | `/api/webhooks/sentry` | Sentry issue ingest |
| `POST` | `/api/webhooks/uptimerobot` | UptimeRobot alert ingest |
| `POST` | `/api/webhooks/github` | GitHub issue ingest |
| `POST` | `/api/webhooks/ingest` | Sentinel Agent metric ingest |

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js 20+
- pnpm 9.15+
- Supabase account (free tier works)
- Clerk account
- Groq API key ([free at console.groq.com](https://console.groq.com))

### 1. Clone & Install

```bash
git clone https://github.com/your-org/sentinel.git
cd sentinel
pnpm install
```

### 2. Configure Environment Variables

```bash
# Copy the root example
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
cp .env.example apps/demo/.env.local
cp .env.example sentinel-agent/.env
```

**Required for core functionality:**

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Clerk
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...

# Groq (AI inference)
GROQ_API_KEY=gsk_...

# Mem0 (AI memory)
MEM0_API_KEY=m0-...
```

**Optional integrations (for full demo):**

```env
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_CHANNEL=incidents

SENTRY_WEBHOOK_SECRET=...
UPTIMEROBOT_WEBHOOK_SECRET=...

RESEND_API_KEY=re_...

UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### 3. Initialize Database

Run the schema in Supabase SQL editor (enables pgvector + creates all tables):

```bash
# File: apps/api/src/db/schema.sql
# Paste contents into: https://supabase.com/dashboard → SQL Editor
```

Verify connectivity:

```bash
pnpm db:setup
```

### 4. Seed Data & Train AI Memory

```bash
pnpm db:seed
```

This runs three scripts in sequence:
```
tsx scripts/seed-incidents.ts   → 10 resolved incidents + pgvector embeddings
tsx scripts/seed-runbooks.ts    → 7 production runbooks + pgvector embeddings
tsx scripts/train-ai-demo.ts    → Mem0 memories for all seeded incidents
```

Re-train only the AI corpus anytime:
```bash
pnpm ai:train
```

### 5. Run Everything

```bash
pnpm dev
```

| Service | URL | Description |
|---|---|---|
| **Dashboard** | http://localhost:3000 | Sentinel command center |
| **API** | http://localhost:3001 | Express REST backend |
| **ShopFlow Demo** | http://localhost:3002 | Chaos demo application |

Individual service commands:
```bash
pnpm dev:web    # Next.js dashboard only
pnpm dev:api    # Express API only
pnpm dev:demo   # ShopFlow demo only
pnpm dev:agent  # Sentinel host agent
```

---

## 🎬 Demo Playbook for Judges

> **Objective:** Show Sentinel catching a real incident, the AI retrieving correct memories, and the full resolution-to-postmortem lifecycle.

### Recommended Demo Flow

**1. Open both apps side by side**
```
Left:  http://localhost:3000/dashboard
Right: http://localhost:3002/demo
```

**2. Trigger a chaos scenario**
- In ShopFlow chaos panel → activate **"Payment Timeout"**
- Hit the checkout or directly call `localhost:3002/api/payments`

**3. Watch Sentinel react**
- Return to the Command Center — a new P1 or P2 incident appears within seconds
- See the ingestion source health dot light up for `sentinel-agent`
- Note the SLA Countdown Tracker starting in the sidebar

**4. Open the Incident Detail page**
- Click the incident → Incident Detail workspace opens
- Note the severity + status badges, the SLA countdown bar

**5. Ask the AI**

```
"Have we seen a payment timeout before?"
```
*Expected: AI cites a pgvector match with 85%+ similarity, gives root cause, lists specific commands*

```
"What is the fastest safe mitigation?"
```
*Expected: AI runs `suggest_fix`, returns confidence score and step-by-step commands*

```
"Which runbook matches this incident?"
```
*Expected: AI returns "Database Pool Recovery" runbook with exact steps*

```
"Check SLA status"
```
*Expected: AI reports remaining time and whether breach is imminent*

**6. Resolve the incident**
- Click "Mitigating" → then "Resolved"
- Ask the AI: `"Write memory for this incident"` — learnings are embedded for next time

**7. Check Postmortems tab**
- The postmortem draft is auto-created with full structure

**8. Analytics tab**
- Show the MTTR trend and Incident Heatmap updating

---

## 📊 SLA Reference

| Severity | Meaning | Default SLA | Auto-Escalates From |
|---|---|---|---|
| **P0** | Total outage — all hands | 15 minutes | — |
| **P1** | Major customer impact | 60 minutes | P1 open > 5m |
| **P2** | Significant degradation | 4 hours | P2 open > 10m |
| **P3** | Minor degradation | 24 hours | P3 open > 15m |
| **P4** | Low priority / cosmetic | 7 days | — |

All SLA targets are **configurable per organization** through the Settings dashboard.

---

<div align="center">

**Sentinel** · Built with TypeScript, Groq, Supabase pgvector, and a lot of `pnpm dev`

*Most incident tools store tickets. Sentinel stores learnings.*

---

*HackBaroda 2026 · Track 5: AI and Developer Tools*

</div>
