// Polyfill for libraries that require a global window object (e.g., mem0ai telemetry in Node)
if (typeof window === 'undefined') {
  (global as any).window = {
    location: { hostname: 'localhost', href: '' },
    navigator: { userAgent: 'Node' },
  };
}
