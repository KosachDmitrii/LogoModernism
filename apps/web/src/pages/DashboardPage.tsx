import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Dna, Shapes, Network, Workflow } from 'lucide-react';
import { getPrinciplesOverview, getKnowledgeGraphStats } from '../api';

const ENGINES = [
  { to: '/prompts', icon: Sparkles, title: 'Prompt Composer', desc: 'Generate ranked logo prompts from design principles' },
  { to: '/brand-dna', icon: Dna, title: 'Brand DNA', desc: 'Analyze brand personality and visual traits' },
  { to: '/geometry', icon: Shapes, title: 'Geometry Intelligence', desc: 'Primitive library and construction systems' },
  { to: '/knowledge-graph', icon: Network, title: 'Knowledge Graph', desc: 'Explore principle compatibility network' },
  { to: '/pipeline', icon: Workflow, title: 'Full Pipeline', desc: 'Run all AI engines in orchestrated sequence' },
];

export function DashboardPage() {
  const { data: overview } = useQuery({ queryKey: ['principles-overview'], queryFn: getPrinciplesOverview });
  const { data: graph } = useQuery({ queryKey: ['graph-stats'], queryFn: getKnowledgeGraphStats });

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">AI BIOS Logo Platform</h1>
        <p className="text-zinc-400 max-w-2xl">
          Enterprise SaaS for modernist logo design — structured knowledge base, AI engines,
          and prompt generation without random guessing.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Design Rules', value: overview?.total ?? '…' },
          { label: 'Categories', value: overview?.categories?.length ?? '…' },
          { label: 'Graph Nodes', value: graph?.stats?.totalNodes ?? '…' },
          { label: 'Graph Edges', value: graph?.stats?.totalEdges ?? '…' },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <p className="text-2xl font-semibold">{stat.value}</p>
            <p className="text-xs text-zinc-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-medium text-zinc-400 mb-4">AI Engines</h2>
      <div className="grid md:grid-cols-2 gap-3">
        {ENGINES.map(({ to, icon: Icon, title, desc }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-start gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-600 transition-colors"
          >
            <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300">
              <Icon size={18} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium mb-1 flex items-center gap-2">
                {title}
                <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500" />
              </h3>
              <p className="text-xs text-zinc-500">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
