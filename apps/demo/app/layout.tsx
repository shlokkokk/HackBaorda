import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ShopFlow — Modern E-Commerce Platform',
  description: 'Chronicle demo victim application for live incident response demonstrations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
