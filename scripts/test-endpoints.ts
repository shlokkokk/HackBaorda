const urls = [
  'https://chronicle-api-c28t.onrender.com/api/health',
  'https://chronicle-api-c28t.onrender.com/health',
  'https://chronicle-api-c28t.onrender.com/',
  'https://chronicle-io.vercel.app/sign-in',
  'https://chronicle-app-demo.vercel.app/api/health',
  'https://chronicle-app-demo.vercel.app/api/chaos',
];

async function check() {
  console.log('📡 Verification of Live Production Services:\n');
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const start = Date.now();
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      const duration = Date.now() - start;
      const contentType = res.headers.get('content-type') ?? '';
      let snippet = '';
      if (contentType.includes('json')) {
        const data = await res.json();
        snippet = JSON.stringify(data);
      } else {
        const text = await res.text();
        snippet = text.slice(0, 120).replace(/\s+/g, ' ');
      }
      console.log(`✅ [STATUS ${res.status}] (${duration}ms) -> ${url}`);
      console.log(`   Response: ${snippet}\n`);
    } catch (err) {
      console.log(`⚠️ [ERROR] -> ${url}: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }
}

check();
