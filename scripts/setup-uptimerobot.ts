// ═══════════════════════════════════════════════════════════
// UptimeRobot Setup Helper Script
// ═══════════════════════════════════════════════════════════

import * as dotenv from 'dotenv';

dotenv.config({ path: 'apps/api/.env' });

const apiKey = process.env.UPTIMEROBOT_API_KEY;
const webhookSecret = process.env.UPTIMEROBOT_WEBHOOK_SECRET;
const demoUrl = process.env.DEMO_APP_URL ?? 'https://chronicle-demo.vercel.app';
const apiPrefix = process.env.NEXT_PUBLIC_APP_URL ?? 'https://chronicle-api.onrender.com';

async function run() {
  console.log('🏁 Starting UptimeRobot Programmatic Monitor Provisioning...\n');

  console.log('🔍 Environment checks:');
  console.log(`- UPTIMEROBOT_API_KEY:        ${apiKey ? '✅ Configured' : '❌ Missing'}`);
  console.log(`- UPTIMEROBOT_WEBHOOK_SECRET: ${webhookSecret ? '✅ Configured' : '❌ Missing'}`);
  console.log(`- DEMO_APP_URL:               ${demoUrl} (URL to monitor)`);
  console.log(`- NEXT_PUBLIC_APP_URL:        ${apiPrefix} (Chronicle URL)`);

  if (!apiKey || !webhookSecret) {
    console.log('\n📋 MANUAL CONFIGURATION STEPS (Since API key is missing):');
    console.log('1. Register for a free account at https://uptimerobot.com');
    console.log('2. Go to "My Settings" -> scroll down to "API Settings" -> generate "Main API Key".');
    console.log('3. Go to "Alert Contacts" -> "Add Alert Contact" -> type: Webhook:');
    console.log(`   - Friendly Name: Chronicle Ingest`);
    console.log(`   - URL to Notify:  ${apiPrefix}/api/webhooks/uptimerobot?secret=<YOUR_WEBHOOK_SECRET>`);
    console.log('   - POST Value (JSON format): Select this option');
    console.log('4. Go to "Dashboard" -> "Add New Monitor":');
    console.log(`   - Monitor Type:  HTTP(s)`);
    console.log(`   - Friendly Name: Chronicle Demo App`);
    console.log(`   - URL/IP:        ${demoUrl}/api/health`);
    console.log('   - Monitoring Interval: 5 minutes');
    console.log('   - Select the Chronicle Ingest Alert Contact checkbox.');
    return;
  }

  const webhookUrl = `${apiPrefix}/api/webhooks/uptimerobot?secret=${webhookSecret}`;

  console.log(`\n🔌 Step 1: Registering Webhook Alert Contact in UptimeRobot...`);
  try {
    const contactRes = await fetch('https://api.uptimerobot.com/v2/newAlertContact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        api_key: apiKey,
        type: '5', // Webhook
        friendly_name: 'Chronicle Webhook Alert Contact',
        value: webhookUrl,
      }),
    });

    const contactData = await contactRes.json() as any;
    let contactId = '';

    if (contactData.stat === 'ok') {
      contactId = contactData.alert_contact.id;
      console.log(`✅ Alert contact created successfully. ID: ${contactId}`);
    } else if (contactData.error && contactData.error.message.includes('already exists')) {
      console.log('ℹ️ Webhook alert contact already registered in UptimeRobot.');
      // Find existing alert contacts
      const getRes = await fetch('https://api.uptimerobot.com/v2/getAlertContacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ api_key: apiKey }),
      });
      const getData = await getRes.json() as any;
      const existing = getData.alert_contacts?.find((c: any) => c.value === webhookUrl);
      if (existing) {
        contactId = existing.id;
        console.log(`Found existing alert contact. ID: ${contactId}`);
      }
    } else {
      console.error(`❌ Failed to create alert contact: ${JSON.stringify(contactData.error)}`);
      return;
    }

    console.log(`\n🖥️ Step 2: Creating HTTP Monitor for Chronicle Demo App...`);
    const monitorRes = await fetch('https://api.uptimerobot.com/v2/newMonitor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        api_key: apiKey,
        friendly_name: 'Chronicle Demo App Status',
        url: `${demoUrl}/api/health`,
        type: '1', // HTTP
        interval: '300', // 5 minutes
        alert_contacts: contactId,
      }),
    });

    const monitorData = await monitorRes.json() as any;
    if (monitorData.stat === 'ok') {
      console.log(`\n🎉 Monitor created successfully!`);
      console.log(`- Monitor ID: ${monitorData.monitor.id}`);
      console.log(`- URL:        ${demoUrl}/api/health`);
    } else {
      console.error(`\n❌ Failed to create monitor: ${JSON.stringify(monitorData.error)}`);
    }
  } catch (err: any) {
    console.error(`\n❌ An error occurred during setup: ${err.message}`);
  }
}

run();
