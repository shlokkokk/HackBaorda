# SENTINEL DEMO APP — Deployment Plan
### Live app that Sentinel monitors for automated incident detection
### Deployed separately, monitored by UptimeRobot + Sentry, triggers real incidents

---

## WHAT IS THIS?

A simple deployed web application that Sentinel monitors in real-time. When this app "breaks" (returns errors), UptimeRobot and Sentry detect it and send real webhooks to Sentinel. This makes your demo **fully automated** — no manual incident creation needed.

**Think of it as:** A fake "production service" that you control. Break it on command → watch Sentinel detect and respond automatically.

---

## APP SPECIFICATION

### What the app does
Simple API service with these endpoints:

| Endpoint | Normal | Broken Mode |
|---|---|---|
| `GET /api/health` | `{"status": "ok", "timestamp": "..."}` | `{"status": "error", "message": "Database connection timeout"}` (HTTP 500) |
| `GET /api/payments` | Returns mock payment data | Throws Stripe API timeout error |
| `GET /api/orders` | Returns mock orders | Returns empty array with 500 error |
| `GET /api/users` | Returns mock users | Memory leak simulation (slow response) |
| `POST /api/toggle-break` | Toggles "broken mode" on/off | — |
| `GET /api/status` | Shows current mode (healthy/broken) | — |

### Tech Stack
| Layer | Tech | Why |
|---|---|---|
| Framework | Next.js API Routes (or Express) | Same stack as main project, easy |
| Deployment | Vercel | Free, same account as main frontend |
| Monitoring | UptimeRobot + Sentry | Already in Sentinel plan |
| Database | None (mock data) | No extra infra needed |

---

## DEPLOYMENT STEPS

### Step 1: Create the app (15 mins)

```bash
# Create new project
mkdir sentinel-demo-app
cd sentinel-demo-app
npx create-next-app@latest . --typescript --app --no-src-dir

# Install Sentry SDK
npm install @sentry/nextjs
```

### Step 2: Create the API routes

**`app/api/health/route.ts`**
```typescript
import { NextResponse } from 'next/server';

// Simple in-memory flag (resets on deploy, fine for demo)
let isBroken = false;

export async function GET() {
  if (isBroken) {
    // Simulate database timeout — triggers UptimeRobot + Sentry
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Database connection timeout after 30s',
        service: 'health-check',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
}
```

**`app/api/payments/route.ts`**
```typescript
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

let isBroken = false;

export async function GET() {
  if (isBroken) {
    const error = new Error('Stripe API timeout: Payment processing failed after 30s');
    Sentry.captureException(error, {
      tags: { service: 'payments-api', environment: 'production' },
      extra: { user_id: 12345, amount: 499.99, currency: 'USD' }
    });

    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    payments: [
      { id: 'pay_123', amount: 99.99, status: 'completed' },
      { id: 'pay_124', amount: 49.99, status: 'completed' }
    ]
  });
}
```

**`app/api/toggle-break/route.ts`**
```typescript
import { NextResponse } from 'next/server';

let isBroken = false;

export async function POST() {
  isBroken = !isBroken;
  return NextResponse.json({
    mode: isBroken ? 'broken' : 'healthy',
    message: isBroken 
      ? 'App is now BROKEN — expect 500 errors' 
      : 'App is now HEALTHY'
  });
}
```

**`app/api/status/route.ts`**
```typescript
import { NextResponse } from 'next/server';

let isBroken = false;

export async function GET() {
  return NextResponse.json({
    mode: isBroken ? 'broken' : 'healthy',
    timestamp: new Date().toISOString()
  });
}
```

### Step 3: Configure Sentry

**`sentry.client.config.ts`**
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: 'production',
  beforeSend(event) {
    // Add custom tags for Sentinel
    event.tags = {
      ...event.tags,
      service: 'sentinel-demo-app',
      team: 'platform'
    };
    return event;
  }
});
```

### Step 4: Deploy to Vercel

```bash
# Push to GitHub
git init
git add .
git commit -m "Initial demo app"
git push origin main

# Deploy on Vercel
# 1. Go to vercel.com → Import Project → select repo
# 2. Add env var: NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
# 3. Deploy → get URL: https://sentinel-demo-app.vercel.app
```

---

## UPTIMEROBOT SETUP (5 mins)

1. Go to [uptimerobot.com](https://uptimerobot.com) → Sign up (free)
2. Click "Add New Monitor"
3. Configure:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** "Sentinel Demo App — Health"
   - **URL:** `https://sentinel-demo-app.vercel.app/api/health`
   - **Monitoring Interval:** 5 minutes
   - **Alert Contact Type:** Webhook
   - **Webhook URL:** `https://your-sentinel-backend.railway.app/api/webhooks/uptimerobot`
   - **Webhook Method:** POST
4. Save

**Repeat for other endpoints:**
- `/api/payments`
- `/api/orders`
- `/api/users`

---

## SENTRY SETUP (10 mins)

1. Go to [sentry.io](https://sentry.io) → Sign up (free)
2. Create new project → Platform: Next.js → Name: `sentinel-demo-app`
3. Copy DSN → add to demo app env vars
4. Go to **Settings → Integrations → Webhooks**
5. Add webhook URL: `https://your-sentinel-backend.railway.app/api/webhooks/sentry`
6. Go to **Alerts → Create Alert Rule**
   - Condition: "An event's level is error or fatal"
   - Action: "Send a notification via Webhook"
7. Save

---

## DEMO APP CONTROL PANEL

Create a simple HTML page to control the demo app during your presentation:

**`app/page.tsx`**
```typescript
'use client';
import { useState } from 'react';

export default function DemoControl() {
  const [mode, setMode] = useState('healthy');

  const toggleBreak = async () => {
    const res = await fetch('/api/toggle-break', { method: 'POST' });
    const data = await res.json();
    setMode(data.mode);
  };

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>🛡️ Sentinel Demo App</h1>
      <p>Current mode: <strong>{mode.toUpperCase()}</strong></p>

      <button 
        onClick={toggleBreak}
        style={{
          padding: '20px 40px',
          fontSize: 18,
          background: mode === 'healthy' ? '#ef4444' : '#22c55e',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer'
        }}
      >
        {mode === 'healthy' ? '💥 BREAK THE APP' : '✅ FIX THE APP'}
      </button>

      <div style={{ marginTop: 40 }}>
        <h3>Monitored Endpoints:</h3>
        <ul>
          <li><a href="/api/health">/api/health</a> — UptimeRobot checks every 5 min</li>
          <li><a href="/api/payments">/api/payments</a> — Sentry tracks errors</li>
          <li><a href="/api/orders">/api/orders</a> — Sentry tracks errors</li>
          <li><a href="/api/users">/api/users</a> — Sentry tracks errors</li>
        </ul>
      </div>
    </div>
  );
}
```

---

## DEMO FLOW WITH AUTO-DETECTION

```
PRE-DEMO (before judges arrive):
1. Demo app is deployed and running (healthy mode)
2. UptimeRobot monitoring /api/health every 5 mins
3. Sentry SDK active on all endpoints
4. Sentinel dashboard open, showing 10 seeded past incidents
5. Ingestion health panel shows: 🟢 UptimeRobot, 🟢 Sentry

DEMO START:
0:00 — "This is our production service. Sentinel monitors it 24/7."
        Show demo app control panel — green, healthy.

0:05 — Click "BREAK THE APP" button.
        "Something just went wrong. Let's see if Sentinel noticed."

0:10 — Switch to Sentinel dashboard.
        Wait for UptimeRobot to detect (max 5 min, but usually faster).
        When it hits: "🟢 UptimeRobot → detected incident"
        New P1 incident auto-created with "Source: UptimeRobot" badge.

0:20 — Agent activates. Memory panel shows search results.
        "Similar to incident #3 — database timeout on health endpoint."

0:30 — Agent response: exact fix steps, confidence score, SLA countdown.
        Slack notification shown.

0:40 — "But what if UptimeRobot missed it? Sentry also caught the error."
        Show deduplication: "Merged from Sentry" on same incident.

0:50 — Click "FIX THE APP" on demo control panel.
        Mark incident resolved in Sentinel.
        Memory count increases. Postmortem auto-generated.

0:55 — Show analytics: "Auto-detected in 3 mins. Previous manual avg: 12 mins."

1:00 — "Sentinel doesn't wait for someone to report incidents.
        It finds them. It remembers them. It fixes them faster every time."
```

---

## TROUBLESHOOTING

| Problem | Fix |
|---|---|
| UptimeRobot not triggering | Check webhook URL is correct. Test with curl: `curl -X POST your-webhook-url` |
| Sentry not sending webhooks | Verify alert rule is active. Check Sentry webhook logs in Settings → Webhooks |
| Incident not appearing | Check backend logs. Verify `source` field is being set correctly |
| Deduplication not working | Check fingerprint algorithm. Ensure both sources detect within 10-min window |
| Demo app crashes on Vercel | Check env vars are set. Vercel has 10s timeout on serverless functions |

---

## COST

| Tool | Cost |
|---|---|
| Vercel (demo app) | Free |
| UptimeRobot | Free (50 monitors) |
| Sentry | Free (5k errors/month) |
| **Total** | **$0** |
