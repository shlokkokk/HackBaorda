You are building **Sentinel** — an AI-powered incident response platform with persistent memory. This is NOT a hackathon toy. This is a production-grade startup product. Build it like you're shipping to Stripe, Netflix, or Vercel tomorrow.

I am giving you three specification documents. Read them fully. Then build the entire system from scratch. Do not ask me for clarification. Do not cut corners. Do not hardcode anything. Every piece of config, every threshold, every color, every animation — must come from env vars, database, or user preference. Nothing is static. and make ui animations everything top tier dynamic and visually magsetic like i win it jus from views use all animations transtions everyhting

---

## THE THREE DOCUMENTS

1. **SENTINEL_IMPL_PLAN_V2.1.md** — Main platform spec (architecture, data models, API, frontend, agent tools, ingestion pipeline)
2. **SENTINEL_AGENT_SPEC_V2.md** — Infrastructure monitoring agent spec (collectors, baseline learning, circuit breaker, heartbeat, self-healing)
3. **SENTINEL_DEMO_APP_PLAN.md** — Demo application spec (breakable endpoints, UptimeRobot + Sentry integration, control panel)[DO NOT MAKE APP RN ONLY MAKE SYSTEM WE WILL MAKE APP LATER]

Read all three. They are one system. The agent is an ingestion source for the main platform. The demo app is what gets monitored.

---

## YOUR MANDATE: ZERO COMPROMISE

### Architecture
- Next.js 14 App Router (App Router, NOT pages router)
- Node.js + Express backend (separate from frontend, NOT API routes)
- Supabase PostgreSQL with pgvector extension
- Clerk auth (frontend + backend JWT verification)
- Mem0 for AI memory layer
- Groq LLM (qwen3-32b) via LangChain.js
- Slack Bolt SDK for real bot (not just webhooks)
- shadcn/ui + Tailwind + Framer Motion for UI
- Real-time updates via Supabase Realtime (not polling)

### The Agent (sentinel-agent/)
- Node.js process that runs independently
- 6 metric collectors: CPU, memory, disk, network, process, uptime
- Baseline learner: EWMA + standard deviation, NOT static thresholds
- Adaptive severity: sigma-based, not hardcoded percentages
- Circuit breaker + retry queue + batch sender
- Heartbeat every 30s to Sentinel
- Self-healing: recovers from crashes, disk full, memory pressure
- Cross-platform: Linux, macOS, Windows, Docker, K8s
- Zero hardcoded values — all thresholds, intervals, windows from env vars

### The Demo App (sentinel-demo-app/)
- Separate Next.js app deployed on Vercel
- Breakable endpoints: /api/health, /api/payments, /api/orders, /api/users
- Toggle endpoint to switch healthy ↔ broken mode
- Sentry SDK integrated (real error capture, not manual)
- Control panel UI with "BREAK THE APP" / "FIX THE APP" button
- State persisted (NOT in-memory — use query param, cookie, or lightweight storage)

### Data Layer
- All 6 tables from spec: incidents, orgs, users, runbooks, agent_interactions, ingestion_health
- Row Level Security (RLS) on all tables
- pgvector embeddings on incidents and runbooks
- Vector similarity search with HNSW index
- Multi-tenant: every query filtered by org_id

### The AI Agent (9 tools + verify_fix)
- search_memory — semantic search via Mem0 + pgvector fallback
- score_severity — dynamic P0-P4 based on impact, time, services, history
- suggest_fix — match to past incidents with confidence score
- escalate_incident — notify on-call, update assignee
- generate_postmortem — structured markdown, exportable
- notify_slack — rich Block Kit messages
- update_status — lifecycle state machine
- write_memory — extract learnings, store in Mem0
- check_sla — countdown timer, breach prediction
- **verify_fix** — NEW: poll health endpoint after auto-fix, confirm resolution

### Ingestion Pipeline
- Unified webhook router: /api/webhooks/ingest
- Source handlers: UptimeRobot, Sentry, Slack, Manual, Sentinel Agent, GitHub Issues
- Normalization: every source → unified incident schema
- Deduplication: fingerprint-based, 10-min window, correlation across metrics
- Source tagging: every incident has source badge
- Ingestion health: live dashboard panel showing all sources, last ping, status

### UI / UX (THIS IS CRITICAL)
- Dark mode default, light mode toggle (system preference respected)
- Real-time: incidents appear instantly via WebSocket, no refresh
- SLA countdown: animated timer, red pulse when < 20%, breach warning
- Memory panel: visual graph of memories retrieved, similarity scores, confidence
- Source badges: color-coded icons for each source (UptimeRobot, Sentry, Agent, Slack, Manual)
- Agent chat: threaded conversation per incident, markdown rendering, code blocks
- Fix suggestion: Mode 1 (copy steps), Mode 2 (confirm + apply with audit log)
- Analytics: MTTR trends, incident heatmap, source reliability scores, memory growth chart
- Mobile responsive: works on phone, tablet, desktop
- Loading states: skeleton screens, not spinners
- Empty states: helpful illustrations, not "No data"
- Error states: retry buttons, auto-retry on network failure
- Animations: subtle entrance animations, staggered lists, smooth transitions
- Toast notifications: success, error, warning with actions

### Security
- Clerk JWT verified on every API call
- Webhook signatures validated per-source (Slack HMAC, Sentry HMAC, UptimeRobot IP whitelist)
- API rate limiting via Upstash Redis
- No secrets in frontend code — all server-side
- CORS configured, helmet headers, input sanitization
- SQL injection impossible via parameterized queries

### No Hardcoded Anything
- All colors: from CSS variables or theme config
- All thresholds: from env vars or org settings
- All text: from i18n config (even if English only for now)
- All demo data: from seed script, not inline
- All API URLs: from env vars
- All timeouts: from env vars
- All intervals: from env vars
- All limits: from env vars or org plan

---

## WHAT TO BUILD FIRST (Priority Order)

### Phase 1: Skeleton (deployed in 2 hours)
1. Monorepo structure with frontend/, backend/, sentinel-agent/, sentinel-demo-app/
2. Supabase project + schema applied + RLS enabled + pgvector enabled
3. Clerk auth wired (sign-in, sign-up, protected routes)
4. Basic dashboard layout (sidebar, header, main content area)
5. Backend deployed to Railway, frontend to Vercel
6. Health check endpoint: GET /api/health → { status: "ok" }

### Phase 2: Core API (2 hours)
1. Incident CRUD with status state machine
2. Webhook ingestion router with all source handlers
3. Deduplication engine
4. Ingestion health tracking
5. Real-time updates via Supabase Realtime

### Phase 3: Agent + Memory (3 hours)
1. Mem0 client setup
2. All 10 agent tools implemented
3. LangChain.js orchestrator
4. Groq LLM integration
5. On incident create → agent auto-triggers
6. On resolve → agent writes memory

### Phase 4: Frontend Polish (2 hours)
1. Incident list with source badges, SLA timers, real-time updates
2. Incident detail with agent chat, memory panel, fix suggestion
3. Dashboard with ingestion health, analytics, memory growth
4. Settings page for org config, SLA, integrations
5. Dark/light mode, animations, responsive

### Phase 5: Slack Bot (1.5 hours)
1. /sentinel new, /sentinel status, /sentinel resolve, /sentinel sources
2. Rich Block Kit messages
3. Thread replies go to agent context

### Phase 6: Demo App + Agent (1.5 hours)
1. Deploy demo app to Vercel
2. Configure UptimeRobot + Sentry
3. Build sentinel-agent with all collectors + baseline learner
4. Test end-to-end: break demo app → auto-detect → AI response → resolve → learn

### Phase 7: Seed + Polish (1 hour)
1. Seed 10 realistic incidents into Mem0 + DB
2. Seed 5 runbooks
3. Record demo walkthrough
4. README with one-command setup

---

## ENVIRONMENT VARIABLES

Create .env files for each service. Never commit them. Use .env.example for templates.

Backend .env:
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLERK_SECRET_KEY, CLERK_WEBHOOK_SECRET, GROQ_API_KEY, MEM0_API_KEY, OPENAI_API_KEY, SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_APP_TOKEN, RESEND_API_KEY, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, UPTIMEROBOT_API_KEY, UPTIMEROBOT_WEBHOOK_SECRET, SENTRY_WEBHOOK_SECRET, SENTRY_DSN, WEBHOOK_SECRET, PORT

Frontend .env.local:
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, NEXT_PUBLIC_APP_URL

Agent .env:
SENTINEL_WEBHOOK_URL, WEBHOOK_SECRET, ORG_ID, CHECK_INTERVAL_MS, BASELINE_WINDOW_HOURS, SIGMA_THRESHOLD, ALERT_COOLDOWN_MS, BATCH_SIZE, BATCH_INTERVAL_MS, CIRCUIT_BREAKER_THRESHOLD, CIRCUIT_BREAKER_TIMEOUT_MS, HEARTBEAT_INTERVAL_MS, MAX_QUEUE_SIZE, RETRY_MAX_AGE_MS, DISABLED_COLLECTORS, CUSTOM_CHECKS, HOSTNAME_OVERRIDE, LOG_LEVEL, DATA_DIR

Demo app .env:
NEXT_PUBLIC_SENTRY_DSN, SENTRY_DSN

---

## DESIGN TOKENS (Use These, Don't Hardcode)

Colors (CSS variables):
--background: #0a0a0a (dark) / #ffffff (light)
--foreground: #fafafa (dark) / #171717 (light)
--card: #171717 (dark) / #ffffff (light)
--card-foreground: #fafafa (dark) / #171717 (light)
--popover: #171717 (dark) / #ffffff (light)
--popover-foreground: #fafafa (dark) / #171717 (light)
--primary: #3b82f6 (blue-500)
--primary-foreground: #ffffff
--secondary: #262626 (dark) / #f5f5f5 (light)
--muted: #262626 (dark) / #f5f5f5 (light)
--muted-foreground: #a3a3a3 (dark) / #737373 (light)
--accent: #262626 (dark) / #f5f5f5 (light)
--destructive: #ef4444 (red-500)
--success: #22c55e (green-500)
--warning: #f59e0b (amber-500)
--border: #262626 (dark) / #e5e5e5 (light)
--input: #262626 (dark) / #e5e5e5 (light)
--ring: #3b82f6

Severity colors:
P0: #dc2626 (red-600), P1: #ef4444 (red-500), P2: #f59e0b (amber-500), P3: #3b82f6 (blue-500), P4: #6b7280 (gray-500)

Source badge colors:
UptimeRobot: #22c55e, Sentry: #ef4444, Sentinel Agent: #3b82f6, Slack: #a855f7, Manual: #6b7280, GitHub: #171717

Font: Inter (Google Fonts), weights 400, 500, 600, 700
Monospace: JetBrains Mono (for code, logs, commands)

Spacing scale: 4px base (0.25rem increments)
Border radius: sm=0.375rem, md=0.5rem, lg=0.75rem, xl=1rem
Shadows: subtle for cards, medium for popovers, large for modals
Transitions: 150ms ease-in-out for colors, 200ms for transforms

---

## CRITICAL RULES

1. NEVER hardcode API URLs, secrets, thresholds, colors, text, or timeouts
2. NEVER use `any` type in TypeScript — strict mode enabled
3. NEVER commit .env files — they are in .gitignore
4. NEVER skip error handling — every async call has try/catch
5. NEVER skip loading states — every data fetch has skeleton or spinner
6. NEVER skip empty states — every list has helpful fallback
7. NEVER skip mobile — test on 375px width
8. NEVER skip accessibility — aria labels, keyboard navigation, focus rings
9. NEVER use `console.log` in production — use structured logging
10. NEVER block the main thread — all heavy work is async or worker-based

---

## FINAL OUTPUT

When you finish a phase, tell me:
- What files were created/modified
- What endpoints are live
- What the user sees when they open the app
- What still needs work

Do not ask me what to build next. Read the spec, pick the highest priority, build it, move to next. If you're unsure, make a decision and document it in a comment. Ship fast, ship clean, ship production-grade.

YOU HAVE FULL FREEDOM IN ARCHITECTURE AND WAT TO ADD MORE THINK WHAT WILL MAKE THIS MORE BETTER AND AADD IF U CAN JUS KEEP EVERYTHING OF OUR MD FILES IN IT ALL FEATURES ALL COMPONENTS ALL EVERYTHING LIKE THIS IS BASE THIS SHOULD ALL BE 100% FUNCTIONALITY IN IT BUT YOU CAN CHOOSE WHATEVER LATEST ARCHITECTURE THAT U FEEL RIGHT AND WHATEVER FEATURES U WANT TO ADD WHICH U THINK WILL MAKE IT TOP TIER BETTER ALR GO ON I TRUST U FULLY MAKE IT VISUALLY SO GOOD THAT WE INSTANTLY WIN AND ALSO ALL FEATURES COVERING ALL TOP TIER ARCHITECUTE AND ESPECIALLY FULLY SCALABLE AND PERFECT LATEST ALL EVERYTHING ALR  