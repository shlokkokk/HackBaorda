// ═══════════════════════════════════════════════════════════
// Slack Application Setup Helper Script
// ═══════════════════════════════════════════════════════════

import * as dotenv from 'dotenv';
import { logger } from '../apps/api/src/lib/logger.js';

dotenv.config({ path: 'apps/api/.env' });

async function run() {
  console.log('🏁 Starting Slack App Configuration Verification...\n');

  const botToken = process.env.SLACK_BOT_TOKEN;
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  const appToken = process.env.SLACK_APP_TOKEN;

  console.log('🔍 Environment Checks:');
  console.log(`- SLACK_BOT_TOKEN:     ${botToken ? '✅ Configured' : '❌ Missing'}`);
  console.log(`- SLACK_SIGNING_SECRET: ${signingSecret ? '✅ Configured' : '❌ Missing'}`);
  console.log(`- SLACK_APP_TOKEN:     ${appToken ? '✅ Configured (Optional for Socket Mode)' : '⚠️ Missing (OK if using Webhook mode)'}`);

  console.log('\n📋 SLACK CONFIGURATION CHECKLIST:');
  console.log('1. Go to https://api.slack.com/apps and create your app.');
  console.log('2. Under "OAuth & Permissions" add the following Bot Token Scopes:');
  console.log('   - chat:write, chat:write.public, commands, channels:read, im:write, users:read');
  console.log('3. Under "Slash Commands", create command:');
  console.log('   - Command:     /sentinel');
  console.log('   - Request URL:  https://<your-backend-url>/api/webhooks/slack');
  console.log('   - Description:  Manage incidents with Sentinel');
  console.log('4. Under "Event Subscriptions", enable events and subscribe to:');
  console.log('   - message.channels (for thread replies)');
  console.log('   - Request URL:  https://<your-backend-url>/api/webhooks/slack');
  console.log('5. Install the app to your workspace and copy the Bot OAuth Token and Signing Secret.');

  if (botToken) {
    console.log('\n⚡ testing Slack connection with current SLACK_BOT_TOKEN...');
    try {
      const res = await fetch('https://slack.com/api/auth.test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${botToken}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json() as { ok: boolean; url?: string; team?: string; user?: string; error?: string };
      if (data.ok) {
        console.log(`\n🎉 Connection Successful!`);
        console.log(`- Workspace: ${data.team}`);
        console.log(`- Bot User:  ${data.user}`);
        console.log(`- URL:       ${data.url}`);
      } else {
        console.log(`\n❌ Slack connection test failed: ${data.error}`);
      }
    } catch (err: any) {
      console.log(`\n❌ Slack connection test failed: ${err.message}`);
    }
  } else {
    console.log('\n⚠️ Skip Slack API test. Set SLACK_BOT_TOKEN in apps/api/.env to test.');
  }
}

run();
