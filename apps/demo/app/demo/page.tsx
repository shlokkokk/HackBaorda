import { Header } from '@/components/Header';
import { ChaosPanel } from '@/components/ChaosPanel';

export default function DemoPage() {
  return (
    <div className="min-h-screen">
      <Header active="demo" />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <ChaosPanel />
      </main>
    </div>
  );
}
