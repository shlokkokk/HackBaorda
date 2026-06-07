# SENTINEL — AI Incident Response Intelligence Platform
### Full Implementation Plan v2.1 | HackBaroda Community Edition PS5
### Industry-grade. No hardcoded data. Real memory. Real agents. Multi-source ingestion.

---

## WHAT ARE YOU BUILDING & WHY IT WINS

Sentinel is a persistent-memory AI agent platform for incident response. Every time an incident is resolved, the agent extracts what was learned and stores it permanently. The next time a similar incident hits, the agent already knows the answer.

**Real apps doing this today (you've probably heard of these):**
- **PagerDuty** — gold standard, $38/month/user, used by Uber, AWS, Slack. Does alerting + on-call, but NO real memory/learning layer
- **Rootly** — modern PagerDuty competitor, Slack-native, $15/user/month
- **Opsgenie** (by Atlassian) — free for 5 users, Jira integration
- **FireHydrant** — incident lifecycle + retrospectives
- **Netflix Dispatch** — open source, what Netflix uses internally (github.com/Netflix/dispatch) — your main blueprint
- **Incident.io** — startup that raised $62M, Slack-first incident management

**What none of them have:** a memory layer that genuinely learns from past incidents and uses that to auto-respond to new ones. That's your gap. That's Sentinel.

**What makes Sentinel different from every other hackathon project:**
- **Multi-source ingestion** — not just manual entry. Real automated detection from UptimeRobot + Sentry + Slack + manual form. All normalized into one pipeline.
- **Source redundancy** — if UptimeRobot fails, Sentry still catches application errors. If both fail, Slack and manual are always available.
- **Ingestion health monitoring** — dashboard shows live status of all ingestion sources. Enterprise-grade observability of the observability tool itself.

---

## PRICING / FREE TIERS (EVERYTHING IS FREE FOR HACKATHON)

| Tool | Free Tier | Limit |
|---|---|---|
| **Supabase** | Free forever | 500MB DB, 2GB bandwidth, pgvector included |
| **Groq API** | Free, no credit card | 1000 req/day, 6000 TPM, 30 RPM for qwen3-32b |
| **Mem0** | Free Hobby plan | 10,000 memories, 1000 retrieval calls/month |
| **Clerk Auth** | Free | 10,000 MAU |
| **Vercel** | Free | Unlimited deploys, custom domain |
| **Railway** | Free trial $5 credit | Enough for hackathon backend |
| **Slack API** | Free | Full API access for bot development |
| **Resend (email)** | Free | 3000 emails/month |
| **Upstash Redis** | Free | 10,000 commands/day (for rate limiting/queues) |
| **UptimeRobot** | Free | 50 monitors, 5-min intervals, webhook alerts |
| **Sentry** | Free | 5k errors/month, APM, webhook alerts |

**Total cost for hackathon: $0**

---

## INDUSTRY REFERENCE REPOS (study these, don't copy)

| Repo | What to learn from it |
|---|---|
| `github.com/Netflix/dispatch` | Incident state machine, plugin architecture, Slack integration patterns |
| `github.com/dastergon/awesome-sre` | Real SRE workflows, postmortem templates, runbook patterns |
| `github.com/PagerDuty/postmortem-templates` | Professional postmortem formats you'll auto-generate |
| `github.com/linkedin/oncall` | On-call scheduling logic and escalation trees |
| `github.com/mem0ai/mem0` | Memory layer architecture, how to structure memories |
| `github.com/langchain-ai/langchainjs` | Agent tool calling patterns, orchestration loops |
| `github.com/vectorize-io/self-driving-agents` | Hackathon-specific agent patterns with memory |
| `github.com/atinylittleshell/gptsh` | How to build CLI agent that executes real commands |
| `github.com/misskey-dev/misskey` | Reference for real-time notification architecture |
| `github.com/getsentry/sentry` | Error ingestion pipeline, webhook normalization patterns |

---

## FULL SYSTEM ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        INGESTION LAYER                                   │
│                                                                          │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│   │ UptimeRobot │  │   Sentry    │  │  Slack Bot  │  │ Manual Form │   │
│   │  (auto)     │  │   (auto)    │  │  /sentinel  │  │ (dashboard) │   │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │
│          │                │                │                │           │
│          └────────────────┴────────────────┴────────────────┘           │
│                                    │                                     │
│                          ┌─────────▼──────────┐                         │
│                          │  WEBHOOK ROUTER    │                         │
│                          │  /api/webhooks/*   │                         │
│                          │  • Normalize all   │                         │
│                          │    sources to      │                         │
│                          │    unified schema  │                         │
│                          │  • Deduplicate     │                         │
│                          │    (fingerprint)   │                         │
│                          │  • Source tagging    │                         │
│                          └─────────┬──────────┘                         │
└────────────────────────────────────┼─────────────────────────────────────┘
                                     │ normalized incident object
┌────────────────────────────────────▼─────────────────────────────────────┐
│                      SENTINEL CORE API                                     │
│                     (Node.js + Express)                                    │
│                                                                          │
│  • Incident CRUD & lifecycle state machine                                 │
│  • Multi-tenant org isolation                                            │
│  • Webhook signature validation (per source)                             │
│  • SLA engine (P0=15m, P1=1h, P2=4h, P3=24h)                             │
│  • Auth middleware (Clerk JWT verification)                              │
│  • Ingestion health tracker (last ping per source)                       │
└──────┬────────────────────────────────────┬───────────────────────────────┘
       │                                    │
┌──────▼────────┐              ┌────────────▼──────────────────────────────┐
│  PostgreSQL   │              │         AGENT LAYER                       │
│  (Supabase)   │              │                                           │
│               │              │  Orchestrator (LangChain.js)              │
│  incidents    │◄────────────►│  ├── Tool: search_memory                 │
│  orgs         │              │  ├── Tool: score_severity                │
│  users        │              │  ├── Tool: suggest_fix                   │
│  runbooks     │              │  ├── Tool: escalate                      │
│  postmortems  │              │  ├── Tool: generate_postmortem           │
│  + pgvector   │              │  ├── Tool: notify_slack                │
│  (embeddings) │              │  ├── Tool: update_status                 │
│  ingestion_   │              │  ├── Tool: write_memory                  │
│  health       │              │  └── Tool: check_sla                     │
└───────────────┘              │                                           │
                               │  Memory: Mem0 (cloud)                     │
                               │  LLM: Groq (qwen3-32b)                    │
                               └───────────────────────────────────────────┘
                                              │
┌─────────────────────────────────────────────▼─────────────────────────────┐
│                     NOTIFICATION LAYER                                      │
│          Slack DM │ Slack Channel │ Email (Resend)                         │
└───────────────────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────▼─────────────────────────────┐
│                      NEXT.JS DASHBOARD                                    │
│                                                                          │
│  /dashboard     — live incident feed + SLA countdowns + ingestion health│
│  /incidents/:id — timeline, agent chat, memory panel, source badge      │
│  /analytics     — MTTR trends, repeat incident rate, source breakdown   │
│  /postmortems   — auto-generated + exportable                           │
│  /settings      — org config, SLA, Slack, webhooks, ingestion sources   │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## HOW THE FIX FLOW WORKS (3 MODES)

When a new incident hits, the agent activates and the engineer sees 3 options:

### Mode 1 — Agent Suggests, Human Executes
- Agent searches memory for similar past incidents
- Returns exact steps/commands that fixed it before
- Engineer reads, decides to apply or not
- Engineer marks resolved, writes what actually worked
- Agent learns and updates memory

### Mode 2 — One-Click Auto-Fix
- Agent finds a past incident with >85% similarity AND a proven fix
- Presents a "Apply Fix" button with the exact runbook steps
- Engineer clicks confirm → fix executes (API call, webhook, or command)
- Agent verifies service health after
- Auto-postmortem generated

### Mode 3 — Manual, Agent Learns Anyway
- Engineer ignores agent, fixes it themselves
- Fills in root cause + resolution in dashboard
- Agent extracts learnings and stores in Mem0
- Future incidents benefit from this human knowledge

**Decision logic:**
```
similarity score < 0.70  →  Mode 1 (generic suggestions + questions)
similarity score 0.70-0.85  →  Mode 1 with specific steps
similarity score > 0.85 + fix is non-destructive  →  Mode 2 available
engineer preference  →  Mode 3 always available
```

---

## INGESTION SOURCES — FULL SPEC

### Source 1: UptimeRobot (Infrastructure Monitoring)
**What it catches:** Server down, HTTP 500, timeout, DNS failure, SSL expiry
**How it works:** Monitors your demo app endpoint every 5 minutes. When down → sends webhook to Sentinel.
**Webhook payload shape:**
```json
{
  "monitorID": 123456789,
  "monitorURL": "https://demo.sentinel.app/api/health",
  "monitorFriendlyName": "Sentinel Demo App Health",
  "alertType": "1",
  "alertTypeFriendlyName": "Down",
  "alertDetails": "HTTP 500 - Internal Server Error",
  "alertDuration": "300",
  "ssl_expiry_date": "",
  "ssl_days_remaining": "",
  "datetime": "1735689600"
}
```
**Sentinel normalization:**
- `title`: "[UptimeRobot] {monitorFriendlyName} — {alertTypeFriendlyName}"
- `description`: `{alertDetails}`
- `source`: `"uptimerobot"`
- `severity`: auto-scored by agent (HTTP 500 = P1, timeout = P2, DNS = P1)
- `affected_services`: extracted from URL path

### Source 2: Sentry (Application Error Monitoring)
**What it catches:** Code exceptions, performance regressions, error rate spikes
**How it works:** SDK in your app reports errors. Alert rules trigger webhooks to Sentinel.
**Webhook payload shape:**
```json
{
  "id": "sentry-event-id",
  "project": "sentinel-demo",
  "project_name": "Sentinel Demo App",
  "culprit": "payments-api/views.py in process_payment",
  "message": "Stripe API timeout after 30s",
  "url": "https://sentry.io/organizations/your-org/issues/12345/",
  "level": "error",
  "logger": "payments-api",
  "event": {
    "tags": [["environment", "production"], ["service", "payments-api"]],
    "extra": {"user_id": 12345, "order_id": "ORD-67890"}
  }
}
```
**Sentinel normalization:**
- `title`: "[Sentry] {culprit} — {message}"
- `description`: Full error message + stack trace summary
- `source`: `"sentry"`
- `severity`: mapped from Sentry level (fatal=P0, error=P1, warning=P2, info=P3)
- `affected_services`: extracted from culprit path and tags

### Source 3: Slack Bot (Manual/Command)
**What it catches:** Engineer-reported incidents via Slack
**Command:** `/sentinel new "Redis timeout — payments failing"`
**Normalization:** Direct — no transformation needed

### Source 4: Manual Form (Dashboard)
**What it catches:** Engineer creates incident via dashboard UI
**Normalization:** Direct — no transformation needed

### Source 5: GitHub Issues (Optional)
**What it catches:** Issues labeled `incident` or `outage`
**Webhook:** GitHub Issues webhook → Sentinel
**Normalization:** Extract title, body, labels → incident

---

## DEDUPLICATION ENGINE

When multiple sources detect the same incident (e.g., UptimeRobot says "server down" AND Sentry reports "connection refused" from the same service), Sentinel deduplicates them.

**Fingerprint algorithm:**
```javascript
// Generate fingerprint from normalized incident
function generateFingerprint(incident) {
  const service = incident.affected_services?.[0] || 'unknown';
  const type = incident.title?.toLowerCase().includes('timeout') ? 'timeout' :
               incident.title?.toLowerCase().includes('500') ? 'http_500' :
               incident.title?.toLowerCase().includes('connection') ? 'connection' :
               'generic';
  const window = Math.floor(Date.now() / (1000 * 60 * 10)); // 10-min window
  return `${service}:${type}:${window}`;
}
```

**Deduplication rules:**
- Same fingerprint within 10 minutes → merge into existing incident, add source as "also reported by"
- Different fingerprint → create new incident
- Manual entries always create new (override with `force_new: true`)

---

## INGESTION HEALTH MONITORING

Dashboard panel showing live status of all ingestion sources:

```
┌─────────────────────────────────────────┐
│  INGESTION HEALTH                       │
├─────────────────────────────────────────┤
│  🟢 UptimeRobot    Last ping: 12s ago  │
│  🟢 Sentry          Last ping: 45s ago │
│  🟢 Slack Bot       Connected           │
│  🟢 Manual Form     Always available    │
│                                         │
│  Total incidents today: 3               │
│  Auto-detected: 2  |  Manual: 1        │
└─────────────────────────────────────────┘
```

**Backend tracking:**
- `ingestion_health` table stores last ping timestamp per source per org
- Background job checks every 60s → marks source as "stale" if no ping in 5 mins
- Alerts admin if ALL auto-sources are down (redundancy failure)

---

## TECH STACK (FINAL)

| Layer | Tech | Version | Why |
|---|---|---|---|
| Frontend | Next.js | 14 App Router | SSR, fast, industry standard |
| UI Components | shadcn/ui + Tailwind | latest | Beautiful, free, accessible |
| Real-time | Supabase Realtime | - | WebSocket for live incident updates |
| Backend | Node.js + Express | 20 LTS | Simple, fast, huge ecosystem |
| Database | PostgreSQL via Supabase | - | Free, pgvector built-in |
| Vector Search | pgvector on Supabase | - | Semantic incident search, free |
| Auth | Clerk | - | 5-min setup, multi-tenant |
| Memory Layer | Mem0 (cloud API) | - | 10K memories free, auto-extraction |
| LLM | Groq (qwen3-32b) | - | Free tier, 1000 req/day, very fast |
| Agent Framework | LangChain.js | latest | Tool calling, agent orchestration |
| Embeddings | Groq / OpenAI-compatible | - | For pgvector search |
| Slack | Slack Bolt SDK | latest | Official, real bot |
| Email | Resend | - | 3K emails/month free |
| Queues | Upstash Redis | - | Rate limiting, async jobs, free |
| Deployment | Vercel (FE) + Railway (BE) | - | Free tiers, instant deploy |
| **Monitoring** | **UptimeRobot** | **Free** | **50 monitors, webhook alerts** |
| **Error Tracking** | **Sentry** | **Free** | **5k errors, APM, webhook alerts** |

---

## CORE DATA MODELS

### incidents table
```sql
id              UUID PRIMARY KEY
org_id          UUID REFERENCES orgs(id)
title           TEXT NOT NULL
description     TEXT
severity        ENUM('P0','P1','P2','P3','P4')
status          ENUM('open','investigating','mitigating','resolved','postmortem')
affected_services  TEXT[]
tags            TEXT[]
assignee_id     UUID REFERENCES users(id)
root_cause      TEXT
resolution      TEXT
sla_breach_at   TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT now()
resolved_at     TIMESTAMPTZ
mem0_memory_ids TEXT[]        -- references to Mem0 memories written
embedding       VECTOR(1536)  -- pgvector embedding of incident for search
source          TEXT DEFAULT 'manual'  -- 'uptimerobot' | 'sentry' | 'slack' | 'manual' | 'github'
source_id       TEXT          -- external ID from source (monitor ID, sentry event ID, etc.)
fingerprint     TEXT          -- deduplication hash
merged_from     TEXT[]        -- array of source IDs merged into this incident
```

### orgs table
```sql
id              UUID PRIMARY KEY DEFAULT uuid_generate_v4()
name            TEXT
slack_workspace_id  TEXT
webhook_secret  TEXT DEFAULT encode(gen_random_bytes(32), 'hex')
sla_config      JSONB  -- {"P0": 15, "P1": 60, "P2": 240, "P3": 1440} (minutes)
created_at      TIMESTAMPTZ DEFAULT now()
```

### users table
```sql
id              UUID PRIMARY KEY (same as Clerk user ID)
org_id          UUID REFERENCES orgs(id)
name            TEXT
email           TEXT
role            ENUM('admin','responder','viewer')
slack_user_id   TEXT
on_call         BOOLEAN DEFAULT false
```

### runbooks table
```sql
id              UUID PRIMARY KEY DEFAULT uuid_generate_v4()
org_id          UUID REFERENCES orgs(id)
title           TEXT
incident_type   TEXT
steps           JSONB   -- array of step objects
safe_to_automate BOOLEAN DEFAULT false
confidence_threshold FLOAT DEFAULT 0.85
created_at      TIMESTAMPTZ DEFAULT now()
embedding       VECTOR(1536)
```

### agent_interactions table
```sql
id              UUID PRIMARY KEY DEFAULT uuid_generate_v4()
incident_id     UUID REFERENCES incidents(id)
query           TEXT
response        TEXT
tools_used      TEXT[]
memories_retrieved JSONB
created_at      TIMESTAMPTZ DEFAULT now()
```

### ingestion_health table (NEW)
```sql
id              UUID PRIMARY KEY DEFAULT uuid_generate_v4()
org_id          UUID REFERENCES orgs(id)
source          TEXT NOT NULL  -- 'uptimerobot' | 'sentry' | 'slack' | 'manual'
status          TEXT DEFAULT 'healthy'  -- 'healthy' | 'stale' | 'down'
last_ping_at    TIMESTAMPTZ DEFAULT now()
last_incident_at TIMESTAMPTZ
total_incidents INTEGER DEFAULT 0
created_at      TIMESTAMPTZ DEFAULT now()

UNIQUE(org_id, source)
```

---

## THE AGENT — FULL TOOL DEFINITIONS

The agent uses LangChain.js structured tool calling. Each tool is a real function.

```javascript
// Tool 1: Search memory for similar incidents
search_memory({
  query: string,        // natural language description of current incident
  org_id: string,       // org isolation
  limit: number         // top N results
})
// → returns array of similar past incidents with similarity scores

// Tool 2: Score severity
score_severity({
  title: string,
  description: string,
  affected_services: string[],
  time_of_day: string,
  org_sla_config: object
})
// → returns { severity: "P1", reasoning: "...", breach_at: timestamp }

// Tool 3: Suggest fix based on memory
suggest_fix({
  incident_id: string,
  similar_incidents: object[],  // from search_memory
  current_symptoms: string[]
})
// → returns { steps: [], confidence: 0.87, runbook_id: string }

// Tool 4: Escalate incident
escalate_incident({
  incident_id: string,
  reason: string,
  escalate_to: string,   // user_id or role
  channel: string        // slack_channel or email
})
// → fires notification, updates incident assignee

// Tool 5: Generate postmortem
generate_postmortem({
  incident_id: string
})
// → returns structured postmortem object, saves to DB

// Tool 6: Notify via Slack
notify_slack({
  channel: string,
  message: string,
  blocks: object[],     // Slack Block Kit rich message
  thread_ts: string     // optional, for threading
})

// Tool 7: Update incident status
update_status({
  incident_id: string,
  status: string,
  notes: string
})

// Tool 8: Write learnings to memory (Mem0)
write_memory({
  org_id: string,
  incident_id: string,
  root_cause: string,
  resolution: string,
  affected_services: string[],
  time_to_resolve: number,
  tags: string[]
})
// → stores in Mem0 + updates pgvector embedding in DB

// Tool 9: Check SLA status
check_sla({
  incident_id: string
})
// → returns { time_remaining_mins: number, breach_risk: boolean }
```

### Agent Loop
```
1. New incident arrives (from any source: UptimeRobot, Sentry, Slack, Manual)
2. Webhook router normalizes to unified schema + deduplicates
3. Agent called with incident context
4. Agent calls search_memory → gets similar past incidents
5. Agent calls score_severity → gets P0-P4 + reasoning
6. Agent calls suggest_fix → gets steps + confidence
7. Agent composes response brief (includes source badge: "Detected by UptimeRobot")
8. Agent calls notify_slack → posts to incident channel
9. Incident resolved → agent called again
10. Agent calls write_memory → stores learnings in Mem0
11. Agent calls generate_postmortem → drafts document
12. Done. Memory count +1. Smarter for next time.
```

---

## MEM0 MEMORY SCHEMA

What gets stored in Mem0 after each resolved incident:

```json
{
  "user_id": "org_{org_id}",
  "metadata": {
    "incident_id": "uuid",
    "title": "Redis connection pool exhausted",
    "affected_services": ["payments-api", "redis-cache"],
    "root_cause_category": "infrastructure/database",
    "root_cause": "max_connections limit hit due to connection leak in payments-api v2.3.1",
    "symptoms": ["connection timeout", "redis ECONNREFUSED", "payments failing"],
    "effective_fix": "Restart payments-api pods, increase redis maxclients to 1000, deploy hotfix",
    "commands_used": ["kubectl rollout restart deployment/payments-api", "redis-cli CONFIG SET maxclients 1000"],
    "time_to_detect_mins": 3,
    "time_to_resolve_mins": 12,
    "severity": "P1",
    "sla_breached": false,
    "tags": ["redis", "connection-pool", "payments", "kubernetes"],
    "lessons_learned": "Add connection pool monitoring alert at 80% capacity",
    "postmortem_id": "uuid",
    "source": "uptimerobot",
    "detection_sources": ["uptimerobot", "sentry"]
  }
}
```

---

## FOLDER STRUCTURE

```
sentinel/
├── frontend/                        # Next.js 14 App Router
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── sign-in/
│   │   │   └── sign-up/
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx             # Dashboard home + ingestion health
│   │   │   ├── incidents/
│   │   │   │   ├── page.tsx         # Incident list with source badges
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx     # Incident detail + agent chat + source info
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx         # MTTR, trends, heatmaps, source breakdown
│   │   │   ├── postmortems/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx         # Org config, SLA, Slack, webhooks, ingestion sources
│   │   └── api/
│   │       └── webhooks/
│   │           └── route.ts         # Thin proxy to backend
│   ├── components/
│   │   ├── incidents/
│   │   │   ├── IncidentCard.tsx
│   │   │   ├── IncidentTimeline.tsx
│   │   │   ├── SLACountdown.tsx
│   │   │   ├── SeverityBadge.tsx
│   │   │   └── SourceBadge.tsx      # NEW: shows UptimeRobot/Sentry/Slack/Manual
│   │   ├── agent/
│   │   │   ├── AgentChat.tsx        # Real-time agent conversation
│   │   │   ├── MemoryPanel.tsx      # Shows what memories were retrieved
│   │   │   ├── FixSuggestion.tsx    # Mode 1/2 fix interface
│   │   │   └── PostmortemViewer.tsx
│   │   ├── ingestion/               # NEW
│   │   │   ├── IngestionHealthPanel.tsx
│   │   │   └── SourceBreakdownChart.tsx
│   │   └── ui/                      # shadcn components
│   └── lib/
│       ├── supabase.ts
│       └── api.ts
│
├── backend/                         # Node.js + Express
│   ├── src/
│   │   ├── index.ts                 # Server entry point
│   │   ├── routes/
│   │   │   ├── incidents.ts         # CRUD + lifecycle
│   │   │   ├── orgs.ts
│   │   │   ├── users.ts
│   │   │   ├── webhooks.ts          # Unified webhook router + source handlers
│   │   │   │   ├── uptimerobot.ts   # NEW: UptimeRobot webhook handler
│   │   │   │   ├── sentry.ts        # NEW: Sentry webhook handler
│   │   │   │   ├── slack.ts         # Slack slash commands
│   │   │   │   └── github.ts        # Optional: GitHub Issues webhook
│   │   │   ├── agent.ts             # Agent query endpoint
│   │   │   └── ingestion.ts         # NEW: Ingestion health API
│   │   ├── agent/
│   │   │   ├── orchestrator.ts      # LangChain agent loop
│   │   │   ├── tools/
│   │   │   │   ├── searchMemory.ts
│   │   │   │   ├── scoreSeverity.ts
│   │   │   │   ├── suggestFix.ts
│   │   │   │   ├── escalate.ts
│   │   │   │   ├── generatePostmortem.ts
│   │   │   │   ├── notifySlack.ts
│   │   │   │   ├── updateStatus.ts
│   │   │   │   ├── writeMemory.ts
│   │   │   │   └── checkSLA.ts
│   │   │   └── prompts/
│   │   │       ├── system.ts        # System prompt for agent
│   │   │       └── postmortem.ts    # Postmortem generation prompt
│   │   ├── services/
│   │   │   ├── mem0.ts              # Mem0 client wrapper
│   │   │   ├── slack.ts             # Slack Bolt app
│   │   │   ├── sla.ts               # SLA calculation engine
│   │   │   ├── embeddings.ts        # Generate + store embeddings
│   │   │   ├── notifications.ts     # Email via Resend
│   │   │   ├── deduplication.ts     # NEW: Fingerprint + dedup engine
│   │   │   └── ingestionHealth.ts   # NEW: Track source health
│   │   ├── db/
│   │   │   ├── schema.sql           # Full DB schema
│   │   │   ├── migrations/
│   │   │   └── queries.ts           # Typed DB query functions
│   │   └── middleware/
│   │       ├── auth.ts              # Clerk JWT verification
│   │       ├── orgIsolation.ts      # Ensure org data isolation
│   │       ├── webhookSig.ts        # Validate webhook signatures
│   │       └── webhookRouter.ts     # NEW: Normalize all sources to unified schema
│   └── package.json
│
└── scripts/
    ├── seed-incidents.ts            # Seeds realistic incidents into Mem0 + DB
    ├── setup-slack.ts             # Slack app configuration helper
    ├── setup-uptimerobot.ts       # NEW: Configure UptimeRobot monitors
    └── setup-sentry.ts            # NEW: Configure Sentry project + alerts
```

---

## ENVIRONMENT VARIABLES

```env
# ─── Supabase ───────────────────────────────
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# ─── Auth (Clerk) ───────────────────────────
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_WEBHOOK_SECRET=

# ─── AI / Memory ────────────────────────────
GROQ_API_KEY=
MEM0_API_KEY=
OPENAI_API_KEY=             # only for embeddings (optional, Groq works too)

# ─── Slack ──────────────────────────────────
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=
SLACK_APP_TOKEN=

# ─── Email ──────────────────────────────────
RESEND_API_KEY=

# ─── Redis (Upstash) ────────────────────────
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# ─── UptimeRobot ────────────────────────────
UPTIMEROBOT_API_KEY=        # NEW: For programmatic monitor management
UPTIMEROBOT_WEBHOOK_SECRET=  # NEW: For validating UptimeRobot webhooks

# ─── Sentry ─────────────────────────────────
SENTRY_WEBHOOK_SECRET=       # NEW: For validating Sentry webhooks
SENTRY_DSN=                  # NEW: For demo app error reporting

# ─── App ─────────────────────────────────────
WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=
DEMO_APP_URL=                # NEW: URL of the demo app being monitored
PORT=3001
```

---

## IMPLEMENTATION PHASES

### Phase 0 — Accounts & Setup (0 code, just signups)
See TODO.md for exact steps.

**NEW additions for Phase 0:**
- Create UptimeRobot account → copy API key
- Create Sentry account → create project → copy DSN + webhook secret
- Configure webhook URLs in both UptimeRobot and Sentry (use Railway URL once deployed)

### Phase 1 — Foundation (skeleton running, deployed)
- Monorepo init, Next.js + Express boilerplate
- Supabase DB created, schema applied (includes NEW `ingestion_health` table)
- Clerk auth wired to both frontend and backend
- Basic incident list page showing data from DB
- Deploy frontend to Vercel, backend to Railway
- **NEW:** Deploy demo app (see SENTINEL_DEMO_APP_PLAN.md)

### Phase 2 — Core Incident API + Multi-Source Ingestion
- Full CRUD for incidents with status state machine
- **NEW:** Webhook ingestion router (`/api/webhooks/ingest`)
- **NEW:** UptimeRobot webhook handler + normalization
- **NEW:** Sentry webhook handler + normalization
- **NEW:** Deduplication engine (fingerprint-based)
- **NEW:** Source tagging on all incidents
- SLA engine calculating breach times
- Real-time updates via Supabase Realtime on dashboard
- **NEW:** Ingestion health tracking (last ping per source)

### Phase 3 — Agent + Memory
- Mem0 client set up, memory namespace per org
- All 9 agent tools implemented as functions
- LangChain.js orchestrator wiring tools + Groq LLM
- On new incident → agent auto-triggered → response posted to Slack
- On resolve → agent writes memory → Mem0 updated
- pgvector embeddings stored for every incident (for local semantic search backup)
- **NEW:** Agent response includes source detection badge ("Detected by UptimeRobot")

### Phase 4 — Frontend Agent UI + Ingestion Health
- Incident detail page with real-time agent chat
- Memory panel showing: query sent → top 3 memories retrieved → similarity scores
- Fix suggestion UI: Mode 1 (read + copy steps) and Mode 2 (confirm + apply button)
- SLA countdown timers (red when < 20% time left)
- **NEW:** Source badge on every incident card (UptimeRobot/Sentry/Slack/Manual)
- **NEW:** Ingestion health panel on dashboard (live status of all sources)
- **NEW:** Source breakdown analytics (pie chart: auto-detected vs manual)

### Phase 5 — Postmortem + Analytics
- Auto postmortem generation on resolution (structured Markdown output)
- Postmortem viewer + PDF export (puppeteer or pdf-lib)
- Analytics page: MTTR over time, incidents by service, repeat rate
- Memory growth chart (total memories stored over time)
- **NEW:** Incidents by source chart (UptimeRobot vs Sentry vs Manual)
- **NEW:** Detection time analysis (how fast auto-sources caught it vs manual)

### Phase 6 — Slack Bot (full)
- `/sentinel new <title>` — creates incident
- `/sentinel status` — lists open incidents
- `/sentinel resolve <id>` — resolves incident
- Agent posts rich Block Kit messages to incident channel
- Thread replies go to agent context
- **NEW:** `/sentinel sources` — shows ingestion health in Slack

### Phase 7 — Polish + Seed + Demo
- Seed 10 realistic incidents into Mem0 + DB (mix of UptimeRobot, Sentry, Manual sources)
- **NEW:** Configure UptimeRobot to monitor demo app
- **NEW:** Configure Sentry on demo app
- **NEW:** Test automated detection flow end-to-end
- Record demo walkthrough
- Mobile responsive check
- README with 1-command setup

---

## DEMO FLOW (60 seconds, wins)

```
0:00 — "Engineering teams lose 45 minutes every incident asking 'has anyone
        seen this before?' Sentinel answers that in 8 seconds.
        And it doesn't wait for someone to report it — it detects incidents
        automatically from multiple sources."

0:08 — Open dashboard. Show 10 resolved incidents in memory.
        Memory panel visible. "Sentinel has learned from 10 past incidents."
        Point to ingestion health panel: "2 auto-detection sources active."

0:12 — Show demo app running. "This is our production service being monitored
        by UptimeRobot every 5 minutes and Sentry for errors."

0:15 — Trigger incident: Break demo app endpoint (returns 500).
        "Watch — no one reported this. Sentinel detected it automatically."

0:20 — UptimeRobot detects 500 error → sends webhook → Sentinel creates incident.
        Dashboard updates in real-time. New P1 incident appears with
        "Source: UptimeRobot" badge.
        Agent activates. Memory panel shows:
        "Querying Mem0... found 2 similar incidents"

0:28 — Agent response appears:
        "Similar to incident #7 (Nov 12) — HTTP 500 on same endpoint.
         Root cause: database connection pool exhausted.
         Fix: restart API pods + increase max_connections.
         Avg resolution: 12 mins. P1 SLA breach in 48 mins."

0:35 — Show Slack channel — agent already posted the suggestion there.
        Slack notification to on-call engineer shown.

0:40 — "But what if UptimeRobot missed it? Sentry also caught the same error
        at the application level. Sentinel deduplicated them into one incident."
        Show merged sources on incident detail.

0:47 — Click "Resolve" → fill root cause → agent writes memory.
        Memory count: 10 → 11. Postmortem auto-generated.

0:52 — "Without Sentinel: 45 mins of Slack archaeology.
        With Sentinel: answer in 8 seconds.
        And we didn't even have to report it — it found us.
        Memory grows with every incident. Gets smarter forever."

0:60 — Show analytics: MTTR dropped from 42 mins → 11 mins after 10 incidents.
        Show source breakdown: 70% auto-detected, 30% manual.
```

---

## WHAT MAKES THIS ENTERPRISE LEVEL (not hackathon toy)

1. **Multi-tenant** — org isolation at every DB query, not just auth
2. **Real webhook validation** — HMAC signature check on all webhooks (UptimeRobot, Sentry, Slack)
3. **SLA engine** — configurable per org per severity, auto-escalates on breach
4. **Memory scoped per org** — your incidents never teach another org's agent
5. **Agent has 9 real tools** — not a chatbot, an orchestrated agent loop
6. **pgvector fallback** — even if Mem0 is down, semantic search still works locally
7. **Structured postmortems** — exportable, follows industry standard format
8. **No hardcoded anything** — all config via env vars, all data from live APIs
9. **Real Slack bot** — not a webhook, an actual bot with slash commands
10. **Audit trail** — every agent interaction logged in DB with tools used + memories retrieved
11. **Multi-source ingestion** — UptimeRobot + Sentry + Slack + Manual, all normalized
12. **Deduplication engine** — prevents alert fatigue from multiple sources detecting same incident
13. **Ingestion health monitoring** — enterprise-grade observability of the observability tool itself
14. **Source redundancy** — if one auto-source fails, others continue; manual always available


##things to add 
No verify_fix tool	After auto-fix, how does agent know it worked?	Add Tool 10: verify_fix — checks service health endpoint
No runbook execution framework	"Apply Fix" button has no backend logic	Add mock executor with audit trail (show command, simulate output)
Webhook auth not specified per-source	UptimeRobot, Sentry, Slack use different signature methods	Add: UptimeRobot = no sig (IP whitelist), Sentry = HMAC, Slack = signature
No severity auto-escalation	If incident affects more services, severity bumps automatically	Static severity. Add note about auto-bump logic
No postmortem review workflow	Real tools require approval before publishing	Auto-generated only. Add "review status" field
Analytics too basic	Heatmaps, time-to-detection trends, source reliability scores	MTTR + count only. Add source reliability chart
also read agentic add md file fully too its jus a top tier addition too for this but i forgot to add it at first yeh so we jus gotta make this top tier fully profesional indutry make like wining hackathon isnt even a conecern its a side thing for it our main is like making it so so good winning is obvious but also a top tier indutrsy level startup too