# SENTINEL — AI Incident Response Intelligence Platform
### Full Implementation Plan v2 | HackBaroda Community Edition PS5
### Industry-grade. No hardcoded data. Real memory. Real agents.

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

---

## FULL SYSTEM ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────────┐
│                        INGESTION LAYER                           │
│                                                                  │
│   Slack Bot    Webhook API    GitHub Issues    Manual Form       │
│   /sentinel    POST /ingest   label:incident   Dashboard UI      │
└──────────────────────────────┬───────────────────────────────────┘
                               │ normalized incident object
┌──────────────────────────────▼───────────────────────────────────┐
│                      SENTINEL CORE API                           │
│                     (Node.js + Express)                          │
│                                                                  │
│  • Incident CRUD & lifecycle state machine                       │
│  • Multi-tenant org isolation                                    │
│  • Webhook signature validation                                  │
│  • SLA engine (P0=15m, P1=1h, P2=4h, P3=24h)                   │
│  • Auth middleware (Clerk JWT verification)                      │
└──────┬────────────────────────────────────┬────────────────────-─┘
       │                                    │
┌──────▼────────┐              ┌────────────▼──────────────────────┐
│  PostgreSQL   │              │         AGENT LAYER               │
│  (Supabase)   │              │                                   │
│               │              │  Orchestrator (LangChain.js)      │
│  incidents    │◄────────────►│  ├── Tool: search_memory         │
│  orgs         │              │  ├── Tool: score_severity        │
│  users        │              │  ├── Tool: suggest_fix           │
│  runbooks     │              │  ├── Tool: escalate              │
│  postmortems  │              │  ├── Tool: generate_postmortem   │
│  + pgvector   │              │  ├── Tool: notify_slack          │
│  (embeddings) │              │  └── Tool: update_status        │
└───────────────┘              │                                   │
                               │  Memory: Mem0 (cloud)            │
                               │  LLM: Groq (qwen3-32b)          │
                               └────────────────────────────────-─┘
                                              │
┌─────────────────────────────────────────────▼─────────────────-─┐
│                     NOTIFICATION LAYER                           │
│          Slack DM │ Slack Channel │ Email (Resend)               │
└─────────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────▼─────────────────-─┐
│                      NEXT.JS DASHBOARD                           │
│                                                                  │
│  /dashboard     — live incident feed + SLA countdowns           │
│  /incidents/:id — timeline, agent chat, memory panel            │
│  /analytics     — MTTR trends, repeat incident rate             │
│  /postmortems   — auto-generated + exportable                   │
│  /settings      — org config, SLA, Slack, webhooks              │
└─────────────────────────────────────────────────────────────────┘
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
```

### orgs table
```sql
id              UUID PRIMARY KEY
name            TEXT
slack_workspace_id  TEXT
webhook_secret  TEXT
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
id              UUID PRIMARY KEY
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
id              UUID PRIMARY KEY
incident_id     UUID REFERENCES incidents(id)
query           TEXT
response        TEXT
tools_used      TEXT[]
memories_retrieved JSONB
created_at      TIMESTAMPTZ DEFAULT now()
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
1. New incident arrives
2. Agent called with incident context
3. Agent calls search_memory → gets similar past incidents
4. Agent calls score_severity → gets P0-P4 + reasoning
5. Agent calls suggest_fix → gets steps + confidence
6. Agent composes response brief
7. Agent calls notify_slack → posts to incident channel
8. Incident resolved → agent called again
9. Agent calls write_memory → stores learnings in Mem0
10. Agent calls generate_postmortem → drafts document
11. Done. Memory count +1. Smarter for next time.
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
    "postmortem_id": "uuid"
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
│   │   │   ├── page.tsx             # Dashboard home
│   │   │   ├── incidents/
│   │   │   │   ├── page.tsx         # Incident list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx     # Incident detail + agent chat
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx         # MTTR, trends, heatmaps
│   │   │   ├── postmortems/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx         # Org config, SLA, integrations
│   │   └── api/
│   │       └── webhooks/
│   │           └── route.ts         # Thin proxy to backend
│   ├── components/
│   │   ├── incidents/
│   │   │   ├── IncidentCard.tsx
│   │   │   ├── IncidentTimeline.tsx
│   │   │   ├── SLACountdown.tsx
│   │   │   └── SeverityBadge.tsx
│   │   ├── agent/
│   │   │   ├── AgentChat.tsx        # Real-time agent conversation
│   │   │   ├── MemoryPanel.tsx      # Shows what memories were retrieved
│   │   │   ├── FixSuggestion.tsx    # Mode 1/2 fix interface
│   │   │   └── PostmortemViewer.tsx
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
│   │   │   ├── webhooks.ts          # Slack, GitHub, generic
│   │   │   └── agent.ts            # Agent query endpoint
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
│   │   │   ├── sla.ts              # SLA calculation engine
│   │   │   ├── embeddings.ts        # Generate + store embeddings
│   │   │   └── notifications.ts    # Email via Resend
│   │   ├── db/
│   │   │   ├── schema.sql           # Full DB schema
│   │   │   ├── migrations/
│   │   │   └── queries.ts           # Typed DB query functions
│   │   └── middleware/
│   │       ├── auth.ts              # Clerk JWT verification
│   │       ├── orgIsolation.ts      # Ensure org data isolation
│   │       └── webhookSig.ts        # Validate webhook signatures
│   └── package.json
│
└── scripts/
    ├── seed-incidents.ts            # Seeds realistic incidents into Mem0 + DB
    └── setup-slack.ts              # Slack app configuration helper
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

# ─── App ─────────────────────────────────────
WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=
PORT=3001
```

---

## IMPLEMENTATION PHASES

### Phase 0 — Accounts & Setup (0 code, just signups)
See TODO.md for exact steps.

### Phase 1 — Foundation (skeleton running, deployed)
- Monorepo init, Next.js + Express boilerplate
- Supabase DB created, schema applied
- Clerk auth wired to both frontend and backend
- Basic incident list page showing data from DB
- Deploy frontend to Vercel, backend to Railway

### Phase 2 — Core Incident API
- Full CRUD for incidents with status state machine
- Webhook ingestion (generic + Slack slash command creates incident)
- SLA engine calculating breach times
- Real-time updates via Supabase Realtime on dashboard

### Phase 3 — Agent + Memory
- Mem0 client set up, memory namespace per org
- All 9 agent tools implemented as functions
- LangChain.js orchestrator wiring tools + Groq LLM
- On new incident → agent auto-triggered → response posted to Slack
- On resolve → agent writes memory → Mem0 updated
- pgvector embeddings stored for every incident (for local semantic search backup)

### Phase 4 — Frontend Agent UI
- Incident detail page with real-time agent chat
- Memory panel showing: query sent → top 3 memories retrieved → similarity scores
- Fix suggestion UI: Mode 1 (read + copy steps) and Mode 2 (confirm + apply button)
- SLA countdown timers (red when < 20% time left)

### Phase 5 — Postmortem + Analytics
- Auto postmortem generation on resolution (structured Markdown output)
- Postmortem viewer + PDF export (puppeteer or pdf-lib)
- Analytics page: MTTR over time, incidents by service, repeat rate
- Memory growth chart (total memories stored over time)

### Phase 6 — Slack Bot (full)
- `/sentinel new <title>` — creates incident
- `/sentinel status` — lists open incidents
- `/sentinel resolve <id>` — resolves incident
- Agent posts rich Block Kit messages to incident channel
- Thread replies go to agent context

### Phase 7 — Polish + Seed + Demo
- Seed 10 realistic incidents into Mem0 + DB
- Record demo walkthrough
- Mobile responsive check
- README with 1-command setup

---

## DEMO FLOW (60 seconds, wins)

```
0:00 — "Engineering teams lose 45 minutes every incident asking 'has anyone
        seen this before?' Sentinel answers that in 8 seconds."

0:08 — Open dashboard. Show 10 resolved incidents in memory.
        Memory panel visible. "Sentinel has learned from 10 past incidents."

0:15 — Trigger new incident live via Slack:
        /sentinel new "Redis connection timeout - payments service degraded"

0:20 — Dashboard updates in real-time. New P1 incident appears.
        Agent activates. Memory panel shows:
        "Querying Mem0... found 2 similar incidents"

0:28 — Agent response appears:
        "Similar to incident #7 (Nov 12) — Redis max_connections hit.
         Fix: restart payments pods + increase maxclients.
         Avg resolution: 12 mins. P1 SLA breach in 48 mins."

0:35 — Show Slack channel — agent already posted the suggestion there.
        Slack notification to on-call engineer shown.

0:42 — Click "Resolve" → fill root cause → agent writes memory.
        Memory count: 10 → 11. Postmortem auto-generated.

0:52 — "Without Sentinel: 45 mins of Slack archaeology.
        With Sentinel: answer in 8 seconds.
        Memory grows with every incident. Gets smarter forever."

0:60 — Show analytics: MTTR dropped from 42 mins → 11 mins after 10 incidents.
```

---

## WHAT MAKES THIS ENTERPRISE LEVEL (not hackathon toy)

1. **Multi-tenant** — org isolation at every DB query, not just auth
2. **Real webhook validation** — HMAC signature check on all webhooks
3. **SLA engine** — configurable per org per severity, auto-escalates on breach
4. **Memory scoped per org** — your incidents never teach another org's agent
5. **Agent has 9 real tools** — not a chatbot, an orchestrated agent loop
6. **pgvector fallback** — even if Mem0 is down, semantic search still works locally
7. **Structured postmortems** — exportable, follows industry standard format
8. **No hardcoded anything** — all config via env vars, all data from live APIs
9. **Real Slack bot** — not a webhook, an actual bot with slash commands
10. **Audit trail** — every agent interaction logged in DB with tools used + memories retrieved
