import { Outlet } from 'react-router-dom';
import { Brain } from 'lucide-react';
import { BrainIngestBanner } from '../components/BrainIngestBanner';

export function AppLayout() {
  return (
    <div className="min-h-screen flex">
      <aside className="w-60 border-r border-zinc-800 bg-zinc-950 flex flex-col shrink-0">
        <div className="p-5 border-b border-zinc-800">
          <h1 className="text-sm font-semibold tracking-tight flex items-center gap-2">
            <Brain size={16} className="text-violet-400" />
            Design Brain
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">Self-learning logo intelligence</p>
        </div>
        <div className="p-4 border-t border-zinc-800 mt-auto">
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider">AI BIOS v1.0</p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto flex flex-col">
        <BrainIngestBanner />
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
