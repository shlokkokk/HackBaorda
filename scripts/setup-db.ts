import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: 'apps/api/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in apps/api/.env');
    process.exit(1);
  }

  const client = createClient(supabaseUrl, supabaseKey);
  console.log('🔌 Connecting to Supabase...');

  try {
    const { error } = await client.from('orgs').select('id').limit(1);
    if (error) {
      console.log('\n⚠️ Could not query "orgs" table. Schema might not be initialized.');
      console.log('👉 Please paste the contents of apps/api/src/db/schema.sql in the Supabase SQL Editor and click RUN.');
    } else {
      console.log('\n✅ Connection successful! Database schema is initialized and ready.');

      const { data: orgs } = await client.from('orgs').select('id,name').order('created_at');
      if (orgs && orgs.length > 0) {
        console.log('\n📋 Organizations in database:');
        orgs.forEach((o) => console.log(`   • ${o.name} → ${o.id}`));
        console.log('\n👉 Run  pnpm setup:agent  to auto-configure sentinel-agent/.env');
      } else {
        console.log('\n👉 No orgs yet. Sign up at http://localhost:3000 then run  pnpm setup:agent');
      }
    }
  } catch (err) {
    console.error('❌ Failed to connect to Supabase:', err);
  }
}

run();
