import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import './globals.css';

export const metadata: Metadata = {
  title: 'Chronicle — AI Incident Response Platform',
  description: 'Intelligent incident response with persistent memory. Detect, respond, learn, repeat.',
  keywords: ['incident response', 'AI', 'DevOps', 'SRE', 'monitoring'],
  authors: [{ name: 'Chronicle Team' }],
  openGraph: {
    title: 'Chronicle — AI Incident Response Platform',
    description: 'Intelligent incident response with persistent memory.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_Zm9vLWJhci0xMi5jbGVyay5hY2NvdW50cy5kZXYk'}
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#3b82f6',
          colorBackground: '#0a0a0a',
          colorInputBackground: '#171717',
          colorInputText: '#fafafa',
          borderRadius: '0.75rem',
          fontFamily: 'Inter, system-ui, sans-serif',
        },
      }}
    >
      <html lang="en" className="dark" suppressHydrationWarning>
        <body className="min-h-screen bg-background antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
