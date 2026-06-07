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
    }
  } catch (err) {
    console.error('❌ Failed to connect to Supabase:', err);
  }
}

run();
