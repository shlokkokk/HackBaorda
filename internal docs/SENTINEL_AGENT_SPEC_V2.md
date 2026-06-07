# SENTINEL AGENT SPECIFICATION v2.0
### Production-Grade Infrastructure Monitoring Agent
### Add-on module for SENTINEL_IMPL_PLAN_V2.1.md
### Zero code blocks — implementation freedom for AI agent

---

## DESIGN PRINCIPLES

1. **Observability-First** — The agent IS an observability tool. It must be observable itself.
2. **Zero Data Loss** — Alerts must survive network partitions, crashes, restarts.
3. **Adaptive Intelligence** — Static thresholds are for toys. Baseline learning is for production.
4. **Platform Agnostic** — Linux, macOS, Windows, Docker, Kubernetes, bare metal.
5. **Minimal Footprint** — <50MB RAM, <1% CPU, single binary or single Node.js process.
6. **Self-Healing** — Detects its own failures, recovers without human intervention.

---

## ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SENTINEL AGENT (per host)                          │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐│
│  │ Collectors  │  │  Baseline   │  │   Engine    │  │  Buffer   ││
│  │  (metrics)  │──►│  Learner    │──►│  (decide)   │──►│  (queue)  ││
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────┬─────┘│
│         │                                                  │       │
│         │         ┌─────────────┐  ┌─────────────┐         │       │
│         │         │  Discovery  │  │   Health    │         │       │
│         └────────►│  (services) │  │   Monitor   │◄────────┘       │
│                   └─────────────┘  └─────────────┘                 │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      OUTPUT PIPELINE                         │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │   │
│  │  │ Circuit  │──►│  Batch   │──►│  Retry   │──►│ Sentinel │   │   │
│  │  │ Breaker  │  │  Sender  │  │  Queue   │  │ Webhook  │   │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## COMPONENT 1: METRIC COLLECTORS

### Required Collectors (always active)

| Collector | Metrics | Platform | Interval |
|---|---|---|---|
| **CPU** | loadavg (1/5/15min), usage % per core, steal time, iowait | All | 10s |
| **Memory** | total, used, free, cached, buffers, swap, available % | All | 10s |
| **Disk** | usage % per mount, read/write IOPS, latency, inode usage | All | 30s |
| **Network** | bytes in/out per interface, packet loss, connections | All | 10s |
| **Process** | top 20 by CPU/memory, zombie count, thread count | All | 30s |
| **Uptime** | system uptime, boot time, load trends | All | 60s |

### Optional Collectors (configurable via env)

| Collector | Metrics | When to Enable |
|---|---|---|
| **Docker** | Container CPU/mem per container, restart count, OOM kills | Host runs Docker |
| **Kubernetes** | Pod status, node pressure, eviction events | Inside K8s cluster |
| **Database** | Connection count, query latency, lock waits | DB on same host |
| **Redis** | Memory usage, hit ratio, connected clients | Redis on same host |
| **Nginx/Apache** | Request rate, 5xx rate, response time | Web server on host |
| **Custom** | Any metric from user-defined shell command or HTTP endpoint | Always available |

### Collector Behavior Spec

- Each collector runs in its own async loop with independent interval
- Failed collectors log error but do NOT crash other collectors
- Metrics are timestamped with nanosecond precision
- Collector errors are reported as "agent_internal" incidents to Sentinel
- All collectors respect `DISABLED_COLLECTORS` env var (comma-separated list)

---

## COMPONENT 2: BASELINE LEARNER

### What It Does

Instead of static thresholds, the agent learns what "normal" looks like for each metric over a rolling window, then alerts on statistically significant deviation.

### Learning Window

| Metric Type | Baseline Window | Update Frequency |
|---|---|---|
| CPU load | 24 hours rolling | Every 5 minutes |
| Memory usage | 7 days rolling | Every 15 minutes |
| Disk usage | 7 days rolling | Every hour |
| Network throughput | 24 hours rolling | Every 5 minutes |
| Process patterns | 7 days rolling | Every hour |

### Deviation Detection

- Uses **exponentially weighted moving average (EWMA)** + standard deviation
- Alert triggers when: `current_value > mean + (Z * stddev)` where Z is configurable (default 3.0 = 99.7% confidence)
- Seasonal adjustment: CPU at 2am has different baseline than 2pm
- Trend detection: gradual degradation over days triggers alert before threshold breach

### Baseline Persistence

- Baselines stored locally in JSON file (survives restarts)
- Optionally synced to Sentinel for cross-host comparison
- If no baseline exists (< 1 hour of data), falls back to static thresholds
- Baselines can be seeded from Sentinel (pre-learned for known host types)

---

## COMPONENT 3: ALERT ENGINE

### Decision Logic

```
Metric collected
     │
     ▼
Has baseline? ──NO──► Use static thresholds (env-configured)
     │ YES
     ▼
Calculate deviation from baseline
     │
     ├── Deviation < 1 sigma ──► Normal, no alert
     │
     ├── Deviation 1-2 sigma ──► Log anomaly, no alert (learning)
     │
     ├── Deviation 2-3 sigma ──► Create "warning" alert (P3)
     │
     └── Deviation > 3 sigma ──► Create "critical" alert (P1/P0)
              │
              ▼
     Is this a known pattern?
              │
              ├── YES (seen in last 24h) ──► Suppress, increment counter
              │
              └── NO ──► Send alert to output pipeline
```

### Alert Deduplication

- **Fingerprint**: `hostname:collector:metric_name:10min_window`
- Same fingerprint within 10 minutes → merge into existing alert, update severity if worsened
- **Correlation**: If CPU + Memory + Disk all spike simultaneously → single "resource exhaustion" alert instead of 3 separate
- **Flapping suppression**: If alert opens/closes 3+ times in 30 minutes → hold open for 30 minutes

### Severity Mapping (Dynamic)

| Condition | Severity | Auto-escalation |
|---|---|---|
| 2-3 sigma deviation | P3 (warning) | Escalate to P2 after 15 mins |
| 3-4 sigma deviation | P2 (high) | Escalate to P1 after 10 mins |
| 4+ sigma deviation | P1 (critical) | Escalate to P0 after 5 mins |
| Multiple correlated alerts | Bump +1 severity | Immediate |
| Repeated within 1 hour | Bump +1 severity | Immediate |

---

## COMPONENT 4: SERVICE DISCOVERY

### Auto-Discovery

Agent scans host and automatically detects running services:

| Detection Method | What It Finds |
|---|---|
| Port scanning (localhost) | MySQL (3306), PostgreSQL (5432), Redis (6379), MongoDB (27017), etc. |
| Process name matching | nginx, apache, node, python, java, dockerd, kubelet |
| Docker socket | Container names, images, ports, restart policies |
| Kubernetes API | Pod labels, namespace, deployment name (if inside cluster) |
| Systemd services | Active services with `systemctl` |

### Service Metadata

Each discovered service gets:
- `name`: human-readable (e.g., "payments-api")
- `type`: database | cache | web_server | app | queue | unknown
- `version`: extracted from process args or HTTP endpoint
- `dependencies`: inferred from network connections
- `criticality`: learned from alert frequency (frequently alerting = more critical)

### Service Health Checks

For each discovered service, agent optionally performs:
- TCP connect check (port open?)
- HTTP health endpoint check (if known path like `/health`)
- Custom command check (configurable per service type)

---

## COMPONENT 5: OUTPUT PIPELINE

### Stage 1: Circuit Breaker

```
Sentinel webhook status:
  ┌─────────┐    ┌─────────┐    ┌─────────┐
  │ CLOSED  │───►│  OPEN   │───►│ HALF-OPEN│
  │ (normal)│    │ (failing)│    │ (testing) │
  └─────────┘    └─────────┘    └─────────┘
       ▲                              │
       └──────────────────────────────┘
              (success after test)
```

- **CLOSED**: Normal operation, alerts sent immediately
- **OPEN**: After 3 consecutive failures, stop sending, queue locally
- **HALF-OPEN**: After 60s, send 1 test alert. Success → CLOSED. Fail → OPEN.
- Failure = HTTP 5xx, timeout (>10s), network error

### Stage 2: Batch Sender

- Alerts queued in memory ring buffer (max 1000 alerts)
- Batches sent every 30 seconds OR when buffer reaches 50 alerts
- Batch payload: `{ alerts: [...], agent_version, hostname, timestamp, sequence_number }`
- Sequence numbers detect dropped batches (Sentinel can request re-send)

### Stage 3: Retry Queue

- Failed batches stored in local JSON file (survives restart)
- Exponential backoff: 5s → 10s → 20s → 40s → max 5 minutes
- Max retry: 24 hours, then drop with error log
- On agent restart, replay retry queue before collecting new metrics

### Stage 4: Sentinel Webhook

- Endpoint: `POST /api/webhooks/ingest`
- Auth: `Authorization: Bearer {WEBHOOK_SECRET}`
- Content-Type: `application/json`
- Timeout: 10 seconds
- Payload schema: See "Alert Payload Schema" below

---

## COMPONENT 6: HEALTH MONITOR (Self-Observability)

### Agent Health Metrics

| Metric | How | Reported To |
|---|---|---|
| Agent uptime | Process start time | Sentinel heartbeat |
| Collector status | Which collectors active/failed | Sentinel heartbeat |
| Last successful alert | Timestamp | Sentinel heartbeat |
| Queue depth | Alerts waiting to send | Sentinel heartbeat |
| Circuit breaker state | OPEN/CLOSED/HALF-OPEN | Sentinel heartbeat |
| Baseline age | Hours since baseline started | Sentinel heartbeat |
| Discovered services | Count + names | Sentinel heartbeat |

### Heartbeat Protocol

- Every 30 seconds, agent sends `POST /api/webhooks/heartbeat`
- Payload includes full health snapshot
- If Sentinel misses 2 consecutive heartbeats (60s), agent marked "stale"
- If missed for 5 minutes, agent marked "down" → create incident
- Heartbeat includes `sequence_number` for ordering

### Self-Healing Behaviors

| Problem | Auto-Response |
|---|---|
| Collector crashes | Restart collector, log incident, continue others |
| Baseline file corrupt | Rebuild from scratch, fallback to static thresholds |
| Disk full (agent cant write queue) | Drop oldest alerts, notify Sentinel with special flag |
| Network partition > 5 mins | Enter "degraded mode" — store locally, batch when restored |
| Memory limit approaching | Reduce collection frequency, drop non-critical metrics |

---

## ALERT PAYLOAD SCHEMA

```json
{
  "version": "2.0",
  "type": "alert",
  "id": "uuid-v4",
  "timestamp": "2026-06-07T13:29:00.000Z",
  "correlation_id": "uuid-v4-for-tracing",

  "source": {
    "type": "sentinel-agent",
    "version": "2.0.0",
    "hostname": "prod-api-01",
    "host_id": "sha256-fingerprint-of-host",
    "platform": "linux",
    "arch": "x64",
    "ip_addresses": ["10.0.1.5", "192.168.1.10"]
  },

  "alert": {
    "fingerprint": "prod-api-01:cpu:loadavg_1min:202606071320",
    "severity": "P1",
    "severity_reason": "4.2 sigma deviation from 24h baseline",
    "title": "Critical CPU load on prod-api-01",
    "description": "1-minute load average at 4.2 sigma above baseline. Sustained for 3 minutes.",
    "status": "firing",
    "started_at": "2026-06-07T13:26:00.000Z",
    "service": "payments-api",
    "service_type": "app"
  },

  "metric": {
    "name": "cpu.loadavg_1min",
    "value": 8.45,
    "unit": "load",
    "baseline": {
      "mean": 1.2,
      "stddev": 0.4,
      "sigma": 4.2,
      "window_hours": 24
    },
    "thresholds": {
      "static": { "p2": 0.80, "p0": 0.95 },
      "adaptive": { "warning": 2.0, "critical": 3.2 }
    }
  },

  "context": {
    "related_metrics": [
      { "name": "cpu.loadavg_5min", "value": 6.1, "sigma": 3.8 },
      { "name": "memory.used_percent", "value": 87.3, "sigma": 2.1 }
    ],
    "top_processes": [
      { "pid": 18432, "name": "node", "cpu_percent": 340.2, "mem_percent": 12.4 }
    ],
    "recent_events": [
      { "type": "deployment", "time": "2026-06-07T13:20:00Z", "detail": "v2.3.1 deployed" }
    ]
  },

  "org_id": "uuid-of-org",
  "metadata": {
    "agent_config": {
      "check_interval_ms": 10000,
      "baseline_window_hours": 24,
      "sigma_threshold": 3.0
    }
  }
}
```

---

## HEARTBEAT PAYLOAD SCHEMA

```json
{
  "version": "2.0",
  "type": "heartbeat",
  "timestamp": "2026-06-07T13:29:00.000Z",
  "sequence_number": 12345,

  "source": {
    "hostname": "prod-api-01",
    "host_id": "sha256-fingerprint",
    "version": "2.0.0"
  },

  "health": {
    "status": "healthy",
    "uptime_seconds": 86400,
    "collectors": {
      "active": ["cpu", "memory", "disk", "network", "process"],
      "failed": [],
      "disabled": ["docker"]
    },
    "baseline_status": "ready",
    "baseline_age_hours": 48,
    "circuit_breaker": "CLOSED",
    "queue_depth": 0,
    "last_alert_at": "2026-06-07T13:15:00Z",
    "discovered_services": [
      { "name": "payments-api", "type": "app", "healthy": true },
      { "name": "redis-cache", "type": "cache", "healthy": true }
    ]
  },

  "org_id": "uuid-of-org"
}
```

---

## CONFIGURATION (ALL ENV VARS)

### Required

| Var | Description | Example |
|---|---|---|
| `SENTINEL_WEBHOOK_URL` | Sentinel ingestion endpoint | `https://api.sentinel.app/webhooks/ingest` |
| `WEBHOOK_SECRET` | Auth token for webhook | `sk_live_...` |
| `ORG_ID` | Organization identifier | `org_abc123` |

### Optional (with defaults)

| Var | Default | Description |
|---|---|---|
| `CHECK_INTERVAL_MS` | `10000` | Base metric collection interval |
| `BASELINE_WINDOW_HOURS` | `24` | How long to learn "normal" |
| `SIGMA_THRESHOLD` | `3.0` | Standard deviations for alert trigger |
| `ALERT_COOLDOWN_MS` | `600000` | Min time between same-fingerprint alerts |
| `BATCH_SIZE` | `50` | Max alerts per batch |
| `BATCH_INTERVAL_MS` | `30000` | Max time between batches |
| `CIRCUIT_BREAKER_THRESHOLD` | `3` | Failures before opening |
| `CIRCUIT_BREAKER_TIMEOUT_MS` | `60000` | Time before half-open test |
| `HEARTBEAT_INTERVAL_MS` | `30000` | How often to ping Sentinel |
| `MAX_QUEUE_SIZE` | `1000` | Local alert buffer limit |
| `RETRY_MAX_AGE_MS` | `86400000` | Max age of queued alert before drop |
| `DISABLED_COLLECTORS` | `""` | Comma-separated list to disable |
| `CUSTOM_CHECKS` | `""` | JSON array of custom shell/HTTP checks |
| `HOSTNAME_OVERRIDE` | `os.hostname()` | Custom hostname reporting |
| `LOG_LEVEL` | `info` | debug, info, warn, error |
| `DATA_DIR` | `./.sentinel-agent` | Where to store baselines and queue |

---

## DEPLOYMENT MODES

| Mode | Use Case | How |
|---|---|---|
| **Standalone** | Single server, VM, laptop | `node sentinel-agent` or binary |
| **Docker** | Containerized environments | Official image, mount `/proc`, `/sys` |
| **Kubernetes DaemonSet** | Every node in cluster | Helm chart, RBAC for K8s API |
| **Systemd Service** | Linux servers | Auto-start on boot, log to journald |
| **Windows Service** | Windows servers | NSSM or native service wrapper |
| **Embedded** | IoT/edge devices | Stripped binary, reduced collectors |

---

## BACKEND INTEGRATION POINTS

### Webhook Router Addition

Add `sentinel-agent` as a first-class source in the unified webhook handler:

- **Route**: `POST /api/webhooks/ingest`
- **Auth**: Bearer token validation
- **Content-Type**: Must accept both single alert and batched arrays
- **Deduplication**: Use `alert.fingerprint` field
- **Severity**: Trust agent's severity (it's smarter than static rules)
- **Service mapping**: Use `alert.service` for affected_services
- **Correlation**: Use `correlation_id` to trace through pipeline
- **Heartbeat handling**: Separate endpoint or `type: "heartbeat"` in same endpoint

### Dashboard Additions

- **Source badge**: "Sentinel Agent" with host icon
- **Host detail page**: Per-host metrics, collector status, baseline graphs
- **Agent fleet view**: All agents, health status, version drift
- **Baseline visualization**: Show learned baseline vs actual metric
- **Sigma timeline**: Deviation scores over time

### Database Additions

- `hosts` table: Track discovered hosts, agent versions, last heartbeat
- `agent_baselines` table: Store learned baselines (optional, for cross-host comparison)
- `agent_metrics` table: Time-series of raw metrics (optional, for analytics)

---

## COMPARISON: SENTINEL AGENT vs INDUSTRY STANDARD

| Feature | Datadog Agent | Prometheus Node Exporter | Grafana Alloy | Sentinel Agent v2.0 |
|---|---|---|---|---|
| Metrics collected | 500+ | 50+ | 100+ | **20+ (extensible)** |
| Baseline learning | ✅ Yes | ❌ No | ❌ No | **✅ Yes** |
| Adaptive thresholds | ✅ Yes | ❌ No | ❌ No | **✅ Yes** |
| Service discovery | ✅ Yes | ❌ No | ✅ Yes | **✅ Yes** |
| Self-healing | ✅ Yes | ❌ No | ⚠️ Partial | **✅ Yes** |
| Circuit breaker | ✅ Yes | ❌ No | ❌ No | **✅ Yes** |
| Alert batching | ✅ Yes | ❌ No | ✅ Yes | **✅ Yes** |
| Cross-platform | ✅ Yes | ⚠️ Linux only | ✅ Yes | **✅ Yes** |
| K8s native | ✅ Yes | ⚠️ Via DaemonSet | ✅ Yes | **✅ Yes** |
| Zero data loss | ✅ Yes | ❌ No | ⚠️ Partial | **✅ Yes** |
| Self-observability | ✅ Yes | ❌ No | ⚠️ Partial | **✅ Yes** |
| Open source | ❌ No | ✅ Yes | ✅ Yes | **✅ Yes** |
| Free | ❌ No | ✅ Yes | ✅ Yes | **✅ Yes** |

**Verdict**: Matches Datadog on intelligence, matches Prometheus on openness, adds baseline learning that neither has in open source.

---

## DEMO FLOW WITH AGENT v2.0

```
PRE-DEMO:
1. Agent running on laptop for 30+ minutes (has baseline)
2. Dashboard shows: 🟢 prod-api-01 | Baseline: ready (32m) | 5 services
3. UptimeRobot + Sentry also active

DEMO:
0:00 — "Sentinel monitors infrastructure, applications, and availability.
        But we don't use static thresholds — we learn what's normal."

0:05 — Show agent baseline graph: "This host's normal CPU is 15-25%.
        Anything above 3 sigma triggers an alert."

0:10 — Trigger stress test (stress-ng or Chrome tabs)
        Agent detects deviation in real-time (10s interval)

0:15 — Dashboard: New P1 incident auto-created
        "Source: Sentinel Agent | Baseline deviation: 4.2 sigma"
        Shows: normal range (green), current value (red), threshold line

0:20 — AI response: "CPU spike correlated with memory climb.
        Similar to incident #5 — runaway Node.js process.
        Top process: node (PID 18432, 340% CPU)"

0:25 — "Notice: no static threshold was configured. The agent learned
        this host's pattern and knew this was abnormal."

0:30 — Kill stress test → metric returns to normal
        Agent auto-resolves incident when deviation drops below 1 sigma

0:35 — Memory count +1. Baseline updated with new data point.
        "The agent gets smarter with every incident."
```

---

## FUTURE ROADMAP (Phase 8+)

| Feature | What | Priority |
|---|---|---|
| Distributed tracing | OpenTelemetry integration, trace alerts back to code changes | High |
| Log correlation | Stream journald/syslog, correlate spikes with log patterns | High |
| Predictive alerts | ML model predicts failure 30 minutes before it happens | Medium |
| Auto-remediation | Agent executes safe fixes (restart service, clear cache) | Medium |
| Multi-region federation | Agents report to regional Sentinel, global dashboard | Low |
| eBPF probes | Kernel-level metrics without overhead | Low |

---

## INTEGRATION CHECKLIST

- [ ] Add `sentinel-agent` to webhook router source handlers
- [ ] Add `hosts` table to database schema
- [ ] Add agent fleet view to dashboard
- [ ] Add baseline visualization component
- [ ] Add sigma timeline chart
- [ ] Add heartbeat endpoint (`POST /api/webhooks/heartbeat`)
- [ ] Add agent source badge to incident cards
- [ ] Create `sentinel-agent/` directory in repo
- [ ] Add agent to deployment docs (Docker, K8s, systemd)
- [ ] Test: run agent 30 mins → trigger stress → verify adaptive alert
- [ ] Demo: show baseline learning live
