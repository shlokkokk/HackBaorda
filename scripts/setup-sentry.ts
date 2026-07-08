// ═══════════════════════════════════════════════════════════
// Sentry Integration Setup Guide & Verification
// ═══════════════════════════════════════════════════════════

import * as dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config({ path: 'apps/api/.env' });

const sentrySecret = process.env.SENTRY_WEBHOOK_SECRET;
const sentryDsn = process.env.SENTRY_DSN;
const apiPrefix = process.env.NEXT_PUBLIC_APP_URL ?? 'https://chronicle-api.onrender.com';

async function run() {
  console.log('🏁 Starting Sentry Integration Guide & Verification...\n');

  console.log('🔍 Environment checks:');
  console.log(`- SENTRY_WEBHOOK_SECRET:      ${sentrySecret ? '✅ Configured' : '❌ Missing'}`);
  console.log(`- SENTRY_DSN:                 ${sentryDsn ? '✅ Configured' : '⚠️ Missing (Will disable reporting in demo app)'}`);
  console.log(`- Chronicle API Endpoint:      ${apiPrefix}/api/webhooks/sentry`);

  console.log('\n📋 SENTRY CONFIGURATION CHECKLIST:');
  console.log('1. Sign up/log in to Sentry (https://sentry.io)');
  console.log('2. Create a new Project:');
  console.log('   - Platform: Next.js (or Node.js depending on service)');
  console.log('   - Name:     chronicle-demo-app');
  console.log('3. Copy the client DSN keys and paste them into:');
  console.log('   - apps/demo/.env.local (as NEXT_PUBLIC_SENTRY_DSN) — primary victim app');
  console.log('   - apps/api/.env (as SENTRY_DSN)');
  console.log('4. Create an Internal Integration for webhook alerts:');
  console.log('   - Go to Settings -> Developer Settings -> Internal Integrations -> "New Internal Integration"');
  console.log('   - Name: Chronicle Alert Ingestion');
  console.log(`   - Webhook URL: ${apiPrefix}/api/webhooks/sentry`);
  console.log('   - Under PERMISSIONS, grant:');
  console.log('     - Issue & Event: Read');
  console.log('   - Under WEBHOOK EVENTS, check:');
  console.log('     - issue (created/resolved/assigned)');
  console.log('     - error (event creation)');
  console.log('5. Save changes and copy the generated "Client Secret" -> paste into SENTRY_WEBHOOK_SECRET.');

  if (sentrySecret) {
    console.log('\n🧪 Generating sample verification signature for testing headers...');
    const samplePayload = JSON.stringify({
      id: 'sentry-test-event-id',
      project_name: 'Chronicle Demo App',
      message: 'Test Sentry connection error exception',
    });

    const hmac = crypto.createHmac('sha256', sentrySecret);
    const signature = hmac.update(samplePayload).digest('hex');

    console.log('To simulate a sentry webhook call via curl, run:');
    console.log(`curl -X POST ${apiPrefix}/api/webhooks/sentry \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -H "X-Sentry-Signature: ${signature}" \\`);
    console.log(`  -d '${samplePayload}'`);
  } else {
    console.log('\n⚠️ Set SENTRY_WEBHOOK_SECRET in apps/api/.env to generate signature curl test commands.');
  }
}

run();
