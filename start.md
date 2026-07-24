# 🚀 Chronicle Quick-Start Guide
> Follow these steps in order to boot up the Chronicle platform, connect your accounts, and seed test data.

---

## 🛠️ Step-by-Step Initialization

### STEP 1: Initialize the Database Schema (Supabase)
Before starting the backend, you must initialize the tables in Supabase:
1. Open your **[Supabase Project Dashboard](https://supabase.com)**.
2. In the left menu, click on the **SQL Editor** tab.
3. Click **New query** (or "Blank query").
4. Open **[apps/api/src/db/schema.sql](file:///c:/Users/Admin/OneDrive/projects/chronicle/apps/api/src/db/schema.sql)**, copy the entire contents of the file, and paste it into the Supabase editor.
5. Click the green **Run** button at the top-right of the editor.
   * *Verify: It should say "Success. No rows returned." and you should see tables like `incidents`, `orgs`, and `users` appear in your Database Table Editor.*

---

### STEP 2: Boot Up the Platform
We use a unified developer loop that starts the backend API, the Next.js dashboard, and the host metrics collector agent concurrently.
1. Open a terminal in the project root (`chronicle/`).
2. Run the start command:
   ```bash
   pnpm dev
   ```
   * *Verify: Keep this terminal open. It will launch:*
     * Backend API on **`http://localhost:3001`**
     * Frontend Dashboard on **`http://localhost:3000`**
     * Chronicle Host Agent running in watch-mode

---

### STEP 3: Create User & Org records (via Clerk Sign-in)
Clerk handles user authentication and communicates automatically with our database via webhooks.
1. Open your browser and go to **`http://localhost:3000`**.
2. Sign up and register for a new account (using your Email or Google).
3. Once logged in, Clerk will automatically trigger a secure webhook to the backend, which:
   * Creates your organization record in the `orgs` database table.
   * Creates your user record in the `users` database table.
   * Maps your user profile to your organization.

---

### STEP 4: Configure Host Agent and Seed Data
Now that your organization is registered in the database, we can seed the test data.
1. Go to your **Supabase Table Editor** and click on the **`orgs`** table.
2. Copy the **`id`** value (which is a UUID string).
3. Auto-configure the host agent (recommended):
   ```bash
   pnpm setup:agent
   ```
   This writes the correct `ORG_ID` and syncs `WEBHOOK_SECRET` into `chronicle-agent/.env`.
   *Alternatively*, manually copy the org UUID from Supabase into `chronicle-agent/.env` as `ORG_ID=...`.
4. In a new terminal window in the project root, run the seeding script:
   ```bash
   pnpm db:seed
   ```
   * *Verify: This command calls Groq, Supabase, and Mem0 to seed:*
     * 10 realistic past outages (combining Sentry, Slack, and UptimeRobot sources).
     * 5 structured runbooks.
     * Persistent AI memories inside Mem0.

---

### STEP 5: Verify the Command Center
1. Refresh your browser at **`http://localhost:3000/dashboard`**.
2. You will see:
   * The **dynamic Source Health panel** showing green/yellow status ticks for active monitors.
   * The **Active Incidents feed** populated with seeded records.
   * The **Incident detail pages** including semantic co-pilot chat modules.

---

### STEP 6: Launch the ShopFlow Demo App
The victim app lets you trigger live failures that flow into Chronicle.

1. Open **`http://localhost:3002`** — the ShopFlow storefront.
2. Go to **`http://localhost:3002/demo`** — the Chaos Engineering Panel.
3. Activate a scenario (e.g. **Payment Gateway Timeout**), then visit Checkout and click Pay.
4. Watch the new incident appear in the Chronicle dashboard.
5. Click **Reset All** when done to restore healthy state.

Optional: set `NEXT_PUBLIC_SENTRY_DSN` in `apps/demo/.env.local` to route JS errors to Sentry → Chronicle webhook.
