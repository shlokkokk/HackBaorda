<!--
  ╔══════════════════════════════════════════════════════════════════════════════╗
  ║                        A NOTE TO THE JUDGES                                 ║
  ╚══════════════════════════════════════════════════════════════════════════════╝
-->

> [!IMPORTANT]
> ### 📝 A Note to the Judges — Please Read Before Scoring
>
> I'm editing this README about 3 hours after the hackathon deadline, and I feel like I owe you an honest explanation before you hit play on that video.
>
> The demo video doesn't reflect the project we actually built. We recorded the demo in separate clips — different parts of the project, one at a time — with the plan to combine them into one clean 5-7 minute walkthrough before submitting. But the laptop we had available just couldn't handle the video editing — it kept crashing, the software struggled with the files, and we were running out of time fast. On top of that, the network connection at the venue was painfully slow, so even uploading the raw clips was a battle. In the chaos of the deadline, the video ended up going out as-is — clips not properly joined, out of order, with the beginning missing context and the ending cut short. It genuinely stings, because we know the first thing you'll see is that video, and it does not represent the project the way we wanted it to.
>
> But the project itself? It's real, complete, and **fully deployed and live right now.** The Chronicle dashboard is running at **[hack-baorda-web.vercel.app](https://hack-baorda-web.vercel.app)**, the API backend is on **[Render](https://chronicle-api-c28t.onrender.com/api/health)**, and the ShopFlow chaos demo app is fully live and running at **[hack-baorda-demo.vercel.app](https://hack-baorda-demo.vercel.app)**. We didn't just build it locally — we shipped it to production. Everything works end-to-end: dual-layer AI memory (Mem0 + pgvector), a 70B parameter LLM pipeline via Groq, a live chaos demo app with 8 triggerable scenarios, auto-escalating SLA enforcement, Slack integration, postmortem generation, analytics dashboards — the whole thing.
>
> So please — if the video doesn't make sense — **give the code and this README a fair read.** Everything is documented here: every feature, every AI capability, every architectural decision. The **[🎬 Demo Playbook for Judges](#-demo-playbook-for-judges)** section gives you a step-by-step walkthrough of the live system — you can open the deployed URLs right now and see it all working.
>
> **We're not asking for special treatment. We're just asking for a fair shot. Don't let a video editing failure on submission night be the thing that defines the breakless, non-stop hard work we poured into this project. Thank you — truly — for taking the time to read this.**

---

<div align="center">

# SENTINEL

### AI-Native Incident Response & Operational Memory Platform

*Detect → Deduplicate → Triage → Recall → Resolve → Learn. Repeat.*

---

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-404D59?style=for-the-badge&logo=express&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Groq](https://img.shields.io/badge/Groq_LLM-F55036?style=for-the-badge&logo=groq&logoColor=white)
![Slack](https://img.shields.io/badge/Slack-4A154B?style=for-the-badge&logo=slack&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)
![Mem0](https://img.shields.io/badge/Mem0_Memory-6366F1?style=for-the-badge&logoColor=white)

[![Dashboard Live](https://img.shields.io/badge/Dashboard-Live%20on%20Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://hack-baorda-web.vercel.app)
[![API Live](https://img.shields.io/badge/API-Live%20on%20Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://chronicle-api-c28t.onrender.com/api/health)
[![Demo Live](https://img.shields.io/badge/Demo%20App-Live%20on%20Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://hack-baorda-demo.vercel.app)

**Built for [HackBaroda 2026](https://hackbaroda.com) · Track 5: AI and Developer Tools**

</div>

---

## 🌐 Live Deployment

> **Everything is deployed. No local setup needed to evaluate.**

| Service | URL | Platform |
|---|---|---|
| 🖥️ **Chronicle Dashboard** | [hack-baorda-web.vercel.app](https://hack-baorda-web.vercel.app) | Vercel |
| ⚙️ **Chronicle API** | [chronicle-api-c28t.onrender.com](https://chronicle-api-c28t.onrender.com/api/health) | Render |
| 🛒 **ShopFlow Demo** | [hack-baorda-demo.vercel.app](https://hack-baorda-demo.vercel.app) | Vercel |

> [!WARNING]
> **Render Free Tier Cold Start:** The API server sleeps after 15 minutes of inactivity. The **first request will take 30–50 seconds** as the server spins up. After that, everything responds instantly. If the dashboard shows "API unreachable" on first load, just wait ~30s and refresh — it'll come alive.

---

## 🧭 Table of Contents

- [Live Deployment](#-live-deployment)
- [The Problem](#-the-problem)
- [What is Chronicle?](#-what-is-chronicle)
- [Core Platform Features](#-core-platform-features)
- [The AI Agent — 10 Specialized Tools](#-the-ai-agent--10-specialized-tools)
- [How the Orchestrator Works](#-how-the-orchestrator-works)
- [Dual-Layer Memory Architecture](#-dual-layer-memory-architecture)
- [SLA Auto-Escalation Daemon](#-sla-auto-escalation-daemon)
- [Alert Deduplication](#-alert-deduplication)
- [Multi-Source Ingestion](#-multi-source-ingestion)
- [Dashboard — Every Page Explained](#-dashboard--every-page-explained)
- [ShopFlow — Live Chaos Demo](#-shopflow--live-chaos-demo)
- [Chronicle Host Agent](#-chronicle-host-agent)
- [Architecture Deep Dive](#-architecture-deep-dive)
- [Tech Stack](#-tech-stack)
- [Full API Surface](#-full-api-surface)
- [Setup & Installation](#-setup--installation)
- [Demo Playbook for Judges](#-demo-playbook-for-judges)
- [SLA Reference](#-sla-reference)

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

## 💡 What is Chronicle?

Chronicle is an **AI-native incident command center** that wraps a persistent operational memory layer around your entire incident lifecycle.

Every resolved incident is embedded into a dual-layer vector database (Mem0 + pgvector). When the next incident fires, the AI Agent instantly retrieves *exactly* what happened last time, *exactly* what the fix was, and *exactly* which runbook to run — before the responder even types a question.

```
Alert Fires  →  Deduplicate (fingerprint)  →  Auto-Triage AI  →  Slack Alert
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

**Chronicle doesn't just respond to incidents. It gets smarter with every one.**

---

## 🎯 Core Platform Features

| Feature | Description |
|---|---|
| 🧠 **Persistent AI Memory** | Dual-layer vector store (Mem0 + pgvector) embeds every resolution permanently |
| 🔔 **Multi-Source Ingestion** | Sentry, UptimeRobot, GitHub, Chronicle Agent, Slack, Manual — all normalized |
| 🤖 **Custom AI Pipeline** | Groq `llama-3.3-70b-versatile` with parallel RAG prefetch across Mem0 + pgvector + runbooks |
| ⏰ **SLA Auto-Escalation** | Background daemon escalates P3→P2→P1→P0 automatically every 60 seconds |
| 🔁 **Alert Deduplication** | SHA-based fingerprinting merges duplicate signals from multiple sources within 10 min |
| 📖 **Runbook Retrieval** | Semantic vector search matches incidents to relevant step-by-step playbooks |
| 📊 **Response Analytics** | MTTR trends (30 days), incident heatmaps (7×24h), severity breakdowns |
| 📋 **Auto Postmortems** | AI generates structured postmortem drafts in Markdown on resolution |
| 👥 **On-Call Routing** | Roster management with Slack identity; auto-assigns on-call engineer to escalations |
| 🖥️ **Host Agent** | Baseline learning + anomaly detection + circuit breaker + graceful shutdown |
| 🔐 **Multi-Org Auth** | Clerk-powered authentication with full org isolation at every data layer |

---

## 🤖 The AI Brain — Custom RAG Pipeline

The intelligence layer in Chronicle is a **custom-built RAG (Retrieval-Augmented Generation) pipeline** powered by **Groq's `llama-3.3-70b-versatile`** — one of the fastest and most capable open models available, running at Groq's silicon speed.

This is **not** a standard agentic tool-calling loop. It's a purpose-built incident intelligence pipeline: memory is fetched in parallel *before* the LLM is ever invoked, so the model always responds with full context in hand rather than making round-trip tool calls. This keeps responses consistently fast (3–8s) and grounded in real data.

> **🔭 Planned Upgrade — NVIDIA NIM**
> The inference layer is designed to be model-agnostic via the `GROQ_MODEL` env var. A natural next step is plugging in **NVIDIA NIM** — NVIDIA's optimized inference microservices — to run models like `llama-3.1-70b-instruct` on dedicated GPU infrastructure. NIM's OpenAI-compatible API means the swap would be nearly zero-code. This is on the roadmap.

### What the AI Can Do

| Capability | How It Works |
|---|---|
| 🔍 **Memory search** | Parallel query across Mem0 + pgvector incidents + runbooks, all scored by similarity |
| ⚖️ **Severity scoring** | Keyword analysis (`outage`, `breach`, `degraded`) + service criticality + time-of-day weighting |
| 🛠️ **Fix suggestion** | Confidence-ranked fix from past resolutions; auto mode (>85%), suggest mode (>70%), manual fallback |
| 📢 **Escalation** | Looks up on-call roster, assigns incident, triggers Slack notification |
| 📋 **Postmortem generation** | Structured Markdown draft written directly to Supabase |
| 💬 **Slack notification** | Sends formatted alert to configured channel via Bolt SDK |
| 🔄 **Status transitions** | Enforces the state machine: `open → investigating → mitigating → resolved → postmortem` |
| 🧠 **Memory write** | Embeds resolution learnings into both Mem0 and pgvector simultaneously |
| ⏱️ **SLA check** | Returns remaining time, breach percentage, and breach boolean in real time |
| ✅ **Fix verification** | HTTP health check (10s timeout) against live endpoint to confirm fix worked |

### Suggested Prompts (Built into the UI)

```
"What caused similar issues before?"
"Suggest a fix"
"Check SLA status"
"Score the severity"
"Which commands should I run?"
"Generate the postmortem"
"Is this a duplicate alert?"
"Write memory for this incident"
```

---

## ⚙️ How the Pipeline Works

Chronicle's AI pipeline uses a **parallel prefetch architecture** — all three memory stores are queried simultaneously *before* the LLM is ever called. Groq receives one single, fully-enriched system prompt and returns one response. No agentic loops, no round-trips. Total response time: **3–8 seconds**.

```typescript
// From orchestrator.ts — parallel prefetch before every LLM call
const [memories, pgResults, runbooks] = await Promise.all([
  searchMemories(searchQuery, orgId, 5),        // Mem0 semantic search (4s timeout)
  searchSimilarIncidents(searchQuery, orgId, 5), // pgvector cosine similarity
  searchSimilarRunbooks(searchQuery, orgId, 3),  // Runbook embedding search
]);

// Injected into system prompt as pre-loaded context:
// "Pre-loaded Context (already fetched — answer directly, do NOT request more data)"
const systemText = buildSystemPrompt(incident, memoryBlock, slaBlock);
// Single LLM call — llama-3.3-70b-versatile via Groq (model configurable via GROQ_MODEL)
const response = await groq.invoke([new SystemMessage(systemText), new HumanMessage(query)]);
```

The system prompt injects the full incident context:
- `title`, `description`, `severity`, `status`, `source`, `affected_services`, `created_at`
- All retrieved memories with their similarity scores
- Live SLA status

Every agent interaction is **logged to `agent_interactions` table** in Supabase (non-blocking, fire-and-forget).

The agent also scores and cites every retrieved memory in its output:

```
[Mem0 92%]     Payment timeout root cause: saturated connection pool...
[pgvector 87%] "Database Pool Exhaustion" — Root: max_connections hit, Fix: restart pgbouncer
[Runbook 81%]  "DB Pool Recovery" — Steps: 1. Check pg_stat_activity 2. Kill idle connections...
```

### Auto-Triage on New Incidents

Every new incident automatically triggers `autoTriageIncident()` in the background:

```typescript
// From orchestrator.ts
const query = `New ${incident.severity} incident from ${incident.source}: "${incident.title}".
Give a 3-bullet triage: similar past incidents, recommended fix, SLA urgency.`;

const response = await runAgent(incident, query, orgId);
// → Posts result to Slack thread automatically
```

---

## 🧠 Dual-Layer Memory Architecture

Chronicle's AI memory is not a simple chat history. It is a **production-grade episodic memory system** combining two complementary retrieval mechanisms.

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
      │   Mem0 API   │        │ Supabase pgvector │
      │ (Long-term)  │        │  (Cosine search)  │
      │  Semantic +  │        │  1536-dim vector  │
      │  Episodic    │        │  embedding column │
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
  effective_fix,        // The exact fix that worked
  severity, source, tags, lessons_learned,
  root_cause_category, symptoms, commands_used,
  time_to_detect_mins, time_to_resolve_mins,
  sla_breached, postmortem_id, detection_sources
}
```

### Memory Layer Details

| Layer | Technology | Timeout | Search Function |
|---|---|---|---|
| **Episodic** | Mem0 API (`mem0ai` SDK) | 4,000ms | Semantic similarity via Mem0's managed index |
| **Structural** | Supabase pgvector | No timeout | Cosine similarity via `search_similar_incidents` RPC |
| **Runbooks** | Supabase pgvector | No timeout | Cosine similarity via `search_similar_runbooks` RPC |

### Embedding Generation

Chronicle uses a **1536-dimensional deterministic embedding** built from character frequency + word-level hashing, normalized to a unit vector. This runs without an external embedding API, making it fully self-contained.

```typescript
// createDeterministicEmbedding() — from embeddings.ts
// Character frequency features + word-level hash features
// Normalized to unit vector for valid cosine similarity
```

### AI Training Corpus

Run `pnpm db:seed` to pre-seed memory with **10 production-grade incident memories** and **7 runbooks**:

| Domain | Scenarios |
|---|---|
| Payments | Authorization timeouts, retry storms, duplicate charges, Stripe webhook failures, worker backlogs |
| Infrastructure | DB pool exhaustion, gateway overload, Redis memory pressure |
| Frontend | Checkout JS crashes, auth token parsing failures |
| Security/Ops | SSL certificate expiry, ingress restart procedures |

Re-train only the AI corpus:
```bash
pnpm ai:train   # Runs train-ai-demo.ts → Mem0 + pgvector
```

---

## ⏰ SLA Auto-Escalation Daemon

Chronicle runs [`slaDaemon.ts`](apps/api/src/services/slaDaemon.ts) as a **background polling loop** every 60 seconds that enforces two automatic escalation rules — no human needed.

### Escalation Rules

**Rule A — Time-Based SLA Escalation**

| Current Severity | Time at Severity | Auto-Escalates To |
|---|---|---|
| P3 | ≥ 15 minutes | **P2** |
| P2 | ≥ 10 minutes | **P1** |
| P1 | ≥ 5 minutes | **P0** |

Elapsed time is measured from `severity_changed_at` tag (not creation time), ensuring accurate tracking after prior escalations.

**Rule B — Scope-Based Escalation**

| Affected Services Count | Auto-Escalates To |
|---|---|
| ≥ 3 services | **P1** |
| ≥ 5 services | **P0** |

### On Each Escalation, the Daemon Automatically:

1. Updates `severity` and recalculates `sla_breach_at` using the org's custom SLA config
2. Stamps a `severity_changed_at:<ISO>` tag on the incident for accurate elapsed-time tracking
3. Emits an `incident.severity_changed` event on the internal event bus
4. Posts a formatted Slack notification with a deep-link to the incident

```typescript
// From slaDaemon.ts
if (inc.severity === 'P2' && elapsedMins >= 10) {
  targetSeverity = 'P1';
  reason = `SLA threshold breached (P2 open for ${Math.floor(elapsedMins)}m, limit 10m)`;
}
// → Updates DB, emits event, notifies Slack thread
```

---

## 🔁 Alert Deduplication

Chronicle's [`deduplication.ts`](apps/api/src/services/deduplication.ts) prevents alert storms from creating duplicate incidents.

Every incoming webhook payload is fingerprinted before insert:

```typescript
// generateFingerprint() from @chronicle/shared
// SHA-based hash of: title + description + affected_services
fingerprint = generateFingerprint({ title, description, affected_services });
```

If a matching fingerprint exists within the last **10 minutes** for an active incident (`open`, `investigating`, or `mitigating`), the new alert is **merged into the existing incident** — the description is updated with a `Also reported by <source>:` entry and the `merged_from` array is updated.

---

## 📡 Multi-Source Ingestion

Chronicle normalizes alerts from every major monitoring tool into a unified incident model.

```
┌─────────────┐  ┌──────────────┐  ┌───────────┐  ┌─────────────┐  ┌──────────────┐
│   Sentry    │  │ UptimeRobot  │  │  GitHub   │  │    Slack    │  │   Chronicle   │
│  (Errors)   │  │  (Uptime)    │  │  (Issues) │  │  (Commands) │  │    Agent     │
└──────┬──────┘  └──────┬───────┘  └─────┬─────┘  └──────┬──────┘  └──────┬───────┘
       │                │                │                │                │
       └────────────────┴────────────────┴────────────────┴────────────────┘
                                         ↓
                            POST /api/webhooks/{source}
                                         ↓
                            ┌────────────────────────┐
                            │   Webhook Adapter      │
                            │   HMAC Verification    │
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

| Source | Webhook File | What It Captures |
|---|---|---|
| **Sentry** | `webhooks/sentry.ts` | Exceptions, errors, regressions |
| **UptimeRobot** | `webhooks/uptimerobot.ts` | Uptime alerts, SSL warnings |
| **GitHub** | `webhooks/github.ts` | Labeled issues converted to incidents |
| **Slack** | `webhooks/slack.ts` | Bolt app — `/chronicle` slash commands, interactive alerts |
| **Chronicle Agent** | `webhooks/agent.ts` | Host metrics, anomaly alerts, heartbeats |
| **ShopFlow Demo** | `webhooks/demo.ts` | Controlled chaos scenario signals |
| **Clerk** | `webhooks/clerk.ts` | User sync and org provisioning |
| **Manual** | Dashboard UI | Responder-created incidents |

---

## 🖥️ Dashboard — Every Page Explained

### 🎛️ Command Center (`/dashboard`)

The war room. Auto-refreshes every **10 seconds**.

- **4 KPI Cards:** Open Incidents · MTTR · Resolved · SLA Breaches — all live from `GET /api/analytics/overview`
- **Recent Incidents Feed:** Last 5 incidents with one-click deep links
- **Quick Actions Panel:** Incidents · Analytics · Runbooks · Chaos Panel
- **Ingestion Source Health Grid:** 6 source tiles (Chronicle Agent, Sentry, UptimeRobot, Slack, GitHub, Manual) with colored health dots showing `healthy / stale / unhealthy` and last-ping timestamp
- **ShopFlow Chaos Panel link** in the header

---

### 🚨 Incidents (`/dashboard/incidents`)

The response workspace for active incidents. **Polls every 8 seconds.**

- **Live incident count** with animated badge
- **Full-text search** with 300ms debounce against title, description, affected services
- **Status filter:** All / Open / Investigating / Mitigating / Resolved / Postmortem
- **Severity filter:** P0 through P4
- **Incident rows:** Color-coded severity pill · title · source icon badge · time-ago · affected services tags · status badge
- **Report Incident** button with inline form: title + description + severity selector
- All incidents are **org-isolated** via Clerk org ID

---

### 🔍 Incident Detail (`/dashboard/incidents/[id]`)

The full AI-powered response workspace per incident.

**Left Column — Main Workspace:**
- Incident header: severity pill · status pill · source badge · title · creation time · affected services
- Status transition buttons: enforces the state machine (`open → investigating → mitigating → resolved → postmortem`)
- **AI Chat Panel** (scrollable, auto-scroll to latest message)
  - Suggested prompt chips built into the UI
  - User messages (right-aligned primary bubbles)
  - AI responses rendered as **full styled ReactMarkdown** (headings, code blocks, lists, blockquotes, inline code)
  - Tool usage badges shown below each AI response (e.g. `search_memory`, `suggest_fix`)
  - Loading state with spinner and elapsed-time hint

**Right Column — Sidebar:**
- **SLA Countdown Tracker:** Live progress bar · time remaining in `Xh Ym` format · pulses red when < 10 minutes
- **Details Panel:** Source · Affected Services · Created At · Resolved At · Tags
- **Linked Memories Panel:** Shows all Mem0 memory IDs written for this incident

---

### 📊 Analytics (`/dashboard/analytics`)

Response intelligence over time.

| Widget | Data Source | Details |
|---|---|---|
| Average MTTR | `GET /api/analytics/overview` | Minutes across all resolved incidents |
| SLA Compliance | `GET /api/analytics/overview` | `100% - breach_count` formatted as percentage |
| Agent Memories | `GET /api/agent/memory/stats` | Live count from Mem0 |
| MTTR Trend Chart | `GET /api/analytics/mttr-trend` | Animated bar chart, last 30 days |
| Incident Heatmap | `GET /api/analytics/heatmap` | 7-day × 24-hour matrix with red intensity scaling |

---

### 📖 Runbooks (`/dashboard/runbooks`)

AI-retrievable step-by-step playbooks.

- **Real-time search** by title and incident type
- **Create Runbook modal:**
  - Title + Incident Trigger Type selector (Deployment Error, Resource Exhaustion, Network Degradation, DB Lock, SSL Expiry, Security Violation)
  - **Safe to Automate** toggle — enables AI Mode 3 (autonomous execution via `suggest_fix` tool)
  - **Confidence Threshold** slider (50%–100%) — AI only auto-runs if similarity exceeds this value
  - Dynamic step builder: Name · Description · Command (all editable inline)
- **Runbook cards:** incident type badge · title · safe/manual badge · threshold · step count
- **Expandable step view** with syntax-highlighted command blocks
- All runbooks are **semantically embedded** into pgvector on creation

---

### 📋 Postmortems (`/dashboard/postmortems`)

The organizational learning archive.

- **Searchable** by incident title and postmortem content
- **Status workflow:** `Draft → In Review → Published` via dropdown
- **Click any row** → animated full-width slideover panel
- Slideover renders: metadata · status selector · **full styled ReactMarkdown**
- **Print / Export PDF** button
- Auto-generated structure: Summary · Timeline · Root Cause · Impact · Resolution · Lessons Learned · Prevention Actions
- Auto-drafted when `generate_postmortem` tool is called

---

### 💻 Agent Fleet (`/dashboard/agents`)

Infrastructure host monitoring visibility.

Per connected host, shows:

| Field | Details |
|---|---|
| Hostname + Host ID | Full identifier with monospace badge |
| OS + Architecture | Platform string + arch (e.g. `linux x64`) |
| Agent Version | Semver string from heartbeat |
| Status Badge | `Healthy / Degraded / Stale / Offline` |
| Circuit Breaker | `CLOSED / OPEN / HALF_OPEN` — OPEN state pulses red |
| Metric Collectors | Green badges for active · pulsing red for failed |
| Baseline Learning | Status + learned horizon in hours + progress bar (complete at 24h) |
| Auto-Discovered Services | Service name · type · port · status |
| IP Addresses | All bound IPs from heartbeat |
| Last Heartbeat | Time-ago string, sourced from `GET /api/agent/hosts` |

---

### 👥 On-Call (`/dashboard/on-call`)

Escalation routing and responder management.

- **Active Responder Panel:** Shows current on-duty engineer with email + Slack identity
- **Warning state:** Full-width red alert when no one is on-call
- **Rotation schedule:** Day-of-week grid showing weekly assignment from roster
- **Fleet cards:** Every org member with role badge, on-call status, "Go On-Call / Take Off-Call" toggle
- Toggling on-call status immediately updates Supabase and feeds into the `escalate_incident` AI tool

---

### ⚙️ Settings (`/dashboard/settings`)

Three-tab organization configuration.

**General:** Org name editor · Slack Workspace ID input

**SLA Policies:** Per-severity SLA target editor (in minutes) for P0 through P4 — changes feed directly into SLA daemon

**Webhook Integrations:** Org ingestion secret (SHA256 HMAC) with one-click copy · Ready-to-paste webhook URLs for UptimeRobot · Sentry · GitHub · Chronicle Agent

---

## 🛒 ShopFlow — Live Chaos Demo

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
| 💳 **Payment Timeout** | `/api/payments` → 504 | Chronicle Agent | Pool saturation, retry storm, stuck workers |
| 🔁 **Duplicate Transaction** | Checkout retry logic | Sentry / Manual | Idempotency keys, charge reconciliation |
| 🔑 **Stripe Webhook Failure** | Signature validation | Sentry | Secret rotation, event replay |
| 🔥 **Gateway Overload** | All APIs → 503 | Chronicle Agent | DB pool exhaustion, pgbouncer restart |
| 💥 **Checkout JS Error** | Frontend crash | Sentry | Rollback, auth token guard |
| 🐢 **Slow Search** | `/api/search` latency spike | Manual | Missing index, query tuning |
| 🧱 **Redis Memory Pressure** | Cache at capacity | Chronicle Agent | Eviction policy, defrag |
| 🔒 **SSL Certificate Expiry** | HTTPS warning | UptimeRobot | Cert renewal, ingress restart |

**Instrumented with Sentry SDK** — errors auto-flow as webhook events to Chronicle.

---

## 🖥️ Chronicle Host Agent

A lightweight **Node.js daemon** (`chronicle-agent/`) that runs on monitored infrastructure and sends metrics and anomaly alerts to Chronicle.

### Internal Architecture

```
Main Loop (configurable interval)
  ↓
captureSystemSnapshot()          ← All collectors run in parallel
  ├── CPU collector
  ├── Memory collector
  ├── Disk collector
  ├── Process collector
  └── Network collector
  ↓
AlertEngine.evaluate(snapshot)   ← Compares vs learned baseline
  ↓
alertsToSend → BatchSender.enqueue()
  ↓
RetryQueue.getReadyAlerts()      ← Circuit breaker gate
  ↓
BatchSender.sendSingleAlert()    ← POST /api/webhooks/ingest
  ↓
HeartbeatSender.send(snapshot)   ← 10% of cycles send full heartbeat
```

### Resilience Features

| Feature | Behavior |
|---|---|
| **Baseline Learner** | Learns normal CPU/memory/disk over 24 hours; prevents false positives during ramp-up |
| **Circuit Breaker** | `CLOSED → OPEN → HALF_OPEN`; stops sending alerts when API is unreachable |
| **Retry Queue** | Failed alerts re-queued with exponential backoff; flushed on graceful shutdown |
| **Batch Sender** | Coalesces multiple alerts into single API calls to reduce overhead |
| **Graceful Shutdown** | `SIGINT / SIGTERM` handlers flush queue before exit |
| **Auto-Discovery** | Scans running processes and open ports to identify active services |

---

## 🏗️ Architecture Deep Dive

### Monorepo Structure

```
chronicle/                         ← pnpm workspaces + Turborepo
├── apps/
│   ├── api/                      Express.js backend
│   │   └── src/
│   │       ├── agent/
│   │       │   ├── orchestrator.ts   AI fast-path (parallel prefetch + Groq)
│   │       │   ├── prompts/
│   │       │   │   └── system.ts     Chronicle AI persona + postmortem template
│   │       │   └── tools/
│   │       │       └── index.ts      All 10 LangChain tools
│   │       ├── db/               Supabase client + schema.sql
│   │       ├── lib/              Config, Pino logger, timeout util
│   │       ├── middleware/       Clerk auth, org validation
│   │       ├── routes/           incidents, analytics, runbooks, postmortems,
│   │       │                     orgs, users, agent, ingestion, webhooks/
│   │       └── services/
│   │           ├── deduplication.ts   SHA fingerprint-based merging
│   │           ├── embeddings.ts      1536-dim pgvector generation + search
│   │           ├── events.ts          Internal typed event bus
│   │           ├── ingestionHealth.ts Source health registry
│   │           ├── mem0.ts            Mem0 SDK integration (4s timeout)
│   │           ├── notifications.ts   Resend email integration
│   │           ├── sla.ts             SLA calculation + breach detection
│   │           ├── slaDaemon.ts       60s background escalation loop
│   │           ├── slack.ts           Bolt SDK — alerts + slash commands
│   │           └── userBootstrap.ts   Clerk webhook → Supabase user sync
│   │
│   ├── web/                      Next.js 14 dashboard
│   │   └── app/
│   │       ├── (auth)/           Sign-in / sign-up pages
│   │       ├── (dashboard)/
│   │       │   ├── layout.tsx    Authenticated sidebar layout
│   │       │   └── dashboard/
│   │       │       ├── page.tsx          Command Center
│   │       │       ├── incidents/        List + Detail pages
│   │       │       ├── analytics/        Charts + heatmap
│   │       │       ├── runbooks/         Runbook CRUD
│   │       │       ├── postmortems/      Archive + slideover
│   │       │       ├── agents/           Host fleet view
│   │       │       ├── on-call/          Roster management
│   │       │       └── settings/         Org config (3 tabs)
│   │       └── components/       LiveBadge, ErrorBanner, EmptyState...
│   │
│   └── demo/                     ShopFlow e-commerce chaos app
│       └── app/
│           ├── api/              payments, search, health, stripe webhook
│           ├── checkout/         Checkout UI
│           └── demo/             Chaos Control Panel (8 scenarios)
│
├── packages/
│   └── shared/                   TypeScript types, Zod schemas, constants
│       └── src/
│           ├── types/            Incident, Runbook, Postmortem, AgentInteraction,
│           │                     MemoryResult, MemoryMetadata...
│           └── constants/        SEVERITY_CONFIG, STATUS_CONFIG, SOURCE_CONFIG,
│                                 STATUS_TRANSITIONS, generateFingerprint()
│
├── chronicle-agent/               Node.js host monitoring daemon
│   └── src/
│       ├── baseline/             BaselineLearner (24h window)
│       ├── collectors/           CPU, Memory, Disk, Network, Process
│       ├── engine/               AlertEngine (anomaly scoring)
│       ├── health/               HeartbeatSender
│       ├── lib/                  Logger, config
│       └── pipeline/             CircuitBreaker, RetryQueue, BatchSender
│
└── scripts/                      Setup and data scripts
    ├── setup-db.ts               Schema + pgvector extension verification
    ├── setup-agent.ts            Agent setup assistant
    ├── setup-demo.ts             Demo app configuration
    ├── setup-slack.ts            Slack Bot configuration guide
    ├── setup-sentry.ts           Sentry webhook setup
    ├── setup-uptimerobot.ts      UptimeRobot configuration
    ├── seed-incidents.ts         10 resolved incidents + pgvector embeddings
    ├── seed-runbooks.ts          7 production runbooks + pgvector embeddings
    └── train-ai-demo.ts          Mem0 training corpus (full incident histories)
```

### Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    MONITORING SOURCES                    │
│  Sentry · UptimeRobot · GitHub · Agent · Slack · Manual │
└─────────────────────────┬───────────────────────────────┘
                           │ Webhook POST (HMAC verified)
                           ↓
┌─────────────────────────────────────────────────────────┐
│                     EXPRESS API                          │
│  · HMAC signature verification                          │
│  · Fingerprint deduplication (10-min window)            │
│  · Incident normalization → Supabase write              │
│  · Event bus: incident.created                          │
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
│  PostgreSQL · pgvector · Clerk org isolation             │
│  incidents · runbooks · postmortems · agent_interactions │
│  users · organizations · ingestion_health · hosts        │
└──────────────────────────┬──────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────┐
│               NEXT.JS DASHBOARD                          │
│  Clerk-authenticated · polls every 8–10s                │
│  8 pages · ReactMarkdown · Recharts · Framer Motion      │
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
| **AI Inference** | Groq (`llama-3.3-70b-versatile`) | Sub-second LLM responses, configurable via `GROQ_MODEL` env var |
| **AI Orchestration** | LangChain JS | Tool routing, system prompt injection |
| **Memory (episodic)** | Mem0 API | Long-term semantic memory with score metadata |
| **Memory (search)** | Supabase pgvector | 1536-dim cosine similarity search |
| **Database** | Supabase PostgreSQL | All persistent data, RLS, Realtime |
| **Cache / Rate Limit** | Upstash Redis | Request rate limiting, ephemeral caching |
| **Notifications** | Slack Bolt SDK | Bot alerts, slash commands, thread replies |
| **Error Tracking** | Sentry (demo app) | Exception capture → webhook → Chronicle |
| **Uptime Monitoring** | UptimeRobot | HTTP monitor alerts → webhook → Chronicle |
| **Email** | Resend | Transactional email notifications |
| **Validation** | Zod | Schema validation on all inputs + tool schemas |
| **Logging** | Pino | Structured JSON logs with service child loggers |
| **UI Animation** | Framer Motion | Staggered list animations, slide panels |
| **Charts** | Recharts | MTTR trend bars, incident heatmap |

---

## 📡 Full API Surface

### Core

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Server heartbeat |

### Incidents

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/incidents` | List incidents (filter by status, severity, search query) |
| `POST` | `/api/incidents` | Create incident |
| `GET` | `/api/incidents/:id` | Get incident + full interaction history |
| `PATCH` | `/api/incidents/:id` | Update incident (status, severity, tags, assignee...) |

### AI Agent

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/agent/query` | Run AI agent query against an incident |
| `GET` | `/api/agent/memory/stats` | Live memory count from Mem0 |
| `GET` | `/api/agent/hosts` | Agent fleet list with health metadata |

### Analytics

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/analytics/overview` | KPI stats (MTTR, breaches, totals, by-severity, by-source) |
| `GET` | `/api/analytics/heatmap` | 7×24 incident frequency matrix |
| `GET` | `/api/analytics/mttr-trend` | 30-day MTTR time series |

### Runbooks & Postmortems

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/runbooks` | List all runbooks |
| `POST` | `/api/runbooks` | Create runbook (auto-embeds into pgvector) |
| `DELETE` | `/api/runbooks/:id` | Delete runbook |
| `GET` | `/api/postmortems` | List postmortems with incident join |
| `PATCH` | `/api/postmortems/:id` | Update postmortem status |

### Ingestion

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/ingestion/health` | Source health registry (last ping times per source) |

### Webhooks

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/webhooks/sentry` | Sentry issue ingest |
| `POST` | `/api/webhooks/uptimerobot` | UptimeRobot alert ingest |
| `POST` | `/api/webhooks/github` | GitHub issue ingest |
| `POST` | `/api/webhooks/ingest` | Chronicle Agent metric ingest |
| `POST` | `/api/webhooks/demo` | ShopFlow chaos signal ingest |
| `POST` | `/api/webhooks/slack` | Slack Bolt event handler |
| `POST` | `/api/webhooks/clerk` | Clerk user/org sync |

### Orgs & Users

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/orgs/sla-config` | Get org SLA policy |
| `PATCH` | `/api/orgs/sla-config` | Update org SLA policy |
| `GET` | `/api/orgs/settings` | Get org settings |
| `PATCH` | `/api/orgs/settings` | Update org settings |
| `GET` | `/api/users` | List org members |
| `PATCH` | `/api/users/:id/on-call` | Toggle on-call status |

---

## 🚀 Setup & Installation

### Prerequisites

- Node.js 20+
- pnpm 9.15+
- Supabase account (free tier works)
- Clerk account
- Groq API key ([free at console.groq.com](https://console.groq.com))
- Mem0 API key ([free at app.mem0.ai](https://app.mem0.ai))

### 1. Clone & Install

```bash
git clone https://github.com/your-org/chronicle.git
cd chronicle
pnpm install
```

### 2. Configure Environment Variables

```bash
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
cp .env.example apps/demo/.env.local
cp .env.example chronicle-agent/.env
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

**Optional integrations (for full demo experience):**

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

Run the schema in Supabase SQL editor (enables pgvector + creates all tables + RPC functions):

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
tsx scripts/seed-incidents.ts    → 10 resolved incidents + pgvector embeddings
tsx scripts/seed-runbooks.ts     → 7 production runbooks + pgvector embeddings
tsx scripts/train-ai-demo.ts     → Mem0 memories for all seeded incidents
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
| **Dashboard** | http://localhost:3000 | Chronicle command center |
| **API** | http://localhost:3001 | Express REST backend |
| **ShopFlow Demo** | http://localhost:3002 | Chaos demo application |

Individual services:
```bash
pnpm dev:web     # Next.js dashboard only
pnpm dev:api     # Express API only
pnpm dev:demo    # ShopFlow demo only
pnpm dev:agent   # Chronicle host agent
```

---

## 🎬 Demo Playbook for Judges

> **Objective:** See Chronicle catch a real incident, retrieve correct memories via AI, and run the full resolution-to-postmortem lifecycle — all on the live deployed system.

> [!NOTE]
> **Render Cold Start:** The first time you open the dashboard, the backend may take **30–50 seconds** to wake up (Render free tier sleeps after inactivity). Just wait and refresh — after that, everything is instant.

### Option A — Use the Live Deployed System (Recommended)

**1. Open the Dashboard**

Go to **[hack-baorda-web.vercel.app](https://hack-baorda-web.vercel.app)** → Sign in with Clerk → You'll land on the **Command Center**.

**2. Wake up the API**

The first load might show "API unreachable" — this is the Render cold start. Wait 30–50 seconds, then refresh. The 4 KPI cards (Open · MTTR · Resolved · SLA Breaches) will populate.

**3. Explore the existing incidents**

Click **Incidents** in the sidebar → you'll see pre-seeded resolved incidents from our training corpus (payment timeouts, DB pool exhaustion, Redis pressure, etc.)

**4. Open any incident → Talk to the AI**

Click into an incident → the **Chronicle AI** chat panel is on the left. Try these prompts:

```
"What caused similar issues before?"
```
*Expected: AI cites pgvector matches with similarity scores, gives root cause, lists specific commands*

```
"Suggest a fix"
```
*Expected: AI returns confidence-ranked fix with step-by-step commands from past resolutions*

```
"Check SLA status"
```
*Expected: AI reports remaining time, breach percentage, and risk level*

```
"Generate the postmortem"
```
*Expected: AI drafts a structured Markdown postmortem (Summary → Timeline → Root Cause → Impact → Resolution → Lessons Learned)*

**5. Trigger Real Chaos Scenarios Live!**

* Open the **ShopFlow Demo Storefront** at **[hack-baorda-demo.vercel.app](https://hack-baorda-demo.vercel.app)** and open the **Chaos Engineering Panel** at **[hack-baorda-demo.vercel.app/demo](https://hack-baorda-demo.vercel.app/demo)**.
* On the Chaos Engineering Panel, click **Activate Scenario** for a scenario like **"Payment Gateway Timeout"** (Severity: P1) or **"CPU Spike"** (Severity: P2).
* Visit the storefront or simulate checks/transactions to trigger the failure live.
* Return to the **Chronicle Dashboard** at **[hack-baorda-web.vercel.app](https://hack-baorda-web.vercel.app)** — a new incident will automatically ingest and appear in the Command Center within seconds, starting the SLA countdown timer.
* Click into the new incident and try querying the Chronicle AI copilot:
```
"What caused similar issues before?"
```
*Expected: AI uses Mem0 memory and pgvector historical context to locate similar incidents and recommend the right mitigation.*
* Deactivate the scenario on the Chaos Panel to restore storefront health, then mark the incident as resolved or run the `verify_fix` command.

**6. Create a new incident manually**

Go to **Incidents** → click **Report Incident** → fill in a title like "Checkout returning 504" with severity P2. Watch it appear in the list.

**7. Walk through the status transitions**

Open the new incident → click **Investigating** → **Mitigating** → **Resolved**. The state machine enforces the correct order.

**8. Check other pages**

| Page | What You'll See |
|---|---|
| 📊 **Analytics** | MTTR trend chart (30-day bar chart) · Incident heatmap (7×24h matrix) · SLA compliance rate |
| 📖 **Runbooks** | 7 pre-seeded runbooks with expandable steps · Create new ones with confidence thresholds |
| 📋 **Postmortems** | Auto-generated drafts · Status workflow (Draft → In Review → Published) · Slideover panel |
| 👥 **On-Call** | Active responder panel · Go On-Call/Off-Call toggle · Weekly rotation grid |
| 💻 **Agent Fleet** | Host monitoring data from connected Chronicle Agents |
| ⚙️ **Settings** | SLA policy editor (per severity) · Webhook integration URLs · Org configuration |

### Option B — Run Locally

**1. Open both apps side by side**
```
Left:  http://localhost:3000/dashboard
Right: http://localhost:3002/demo
```

**2. Trigger a chaos scenario**
- In ShopFlow chaos panel → activate **"Payment Timeout"**
- Hit the checkout or call `localhost:3002/api/payments` directly

**3. Watch Chronicle react**
- A new P1 or P2 incident appears in the Command Center within seconds
- The ingestion source health dot lights up for `chronicle-agent`
- SLA Countdown Tracker starts in the sidebar

**4. Open the Incident Detail page and interact with the AI**
- Follow the same AI prompts from Option A above
- Additionally try: `"Write memory for this incident"` to embed learnings for future retrieval

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

**Chronicle** · Built with TypeScript, Groq, Supabase pgvector, Mem0, and a lot of `pnpm dev`

*Most incident tools store tickets. Chronicle stores learnings.*

---

*HackBaroda 2026 · Track 5: AI and Developer Tools*

</div>
