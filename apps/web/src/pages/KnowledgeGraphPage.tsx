import { useQuery } from '@tanstack/react-query';
import { getKnowledgeGraphStats } from '../api';

const RELATION_COLORS: Record<string, string> = {
  works_with: 'bg-emerald-900/50 text-emerald-300',
  requires: 'bg-blue-900/50 text-blue-300',
  conflicts_with: 'bg-red-900/50 text-red-300',
  enhances: 'bg-purple-900/50 text-purple-300',
};

export function KnowledgeGraphPage() {
  const { data, isLoading } = useQuery({ queryKey: ['graph-stats'], queryFn: getKnowledgeGraphStats });

  if (isLoading) return <div className="p-10 text-zinc-500">Loading graph…</div>;

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold mb-1">Knowledge Graph</h1>
        <p className="text-sm text-zinc-500">Design principle compatibility network</p>
      </header>

      {data?.stats && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          {Object.entries(data.stats).map(([key, val]) => (
            <div key={key} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
              <p className="text-xl font-semibold">{String(val)}</p>
              <p className="text-xs text-zinc-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-sm font-medium text-zinc-400 mb-3">Clusters by Category</h2>
      <div className="grid md:grid-cols-3 gap-3 mb-8">
        {data?.clusters?.map((cluster: { name: string; nodeIds: string[] }) => (
          <div key={cluster.name} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <h3 className="text-sm font-medium capitalize mb-1">{cluster.name.replace(/_/g, ' ')}</h3>
            <p className="text-xs text-zinc-500">{cluster.nodeIds.length} principles</p>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-medium text-zinc-400 mb-3">Recent Edges (sample)</h2>
      <div className="space-y-1.5 max-h-96 overflow-auto">
        {data?.edges?.slice(0, 50).map((edge: { from: string; to: string; relation: string }, i: number) => (
          <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-zinc-900/50">
            <span className="text-zinc-400 truncate flex-1">{edge.from}</span>
            <span className={`px-2 py-0.5 rounded-full ${RELATION_COLORS[edge.relation] ?? 'bg-zinc-800'}`}>
              {edge.relation}
            </span>
            <span className="text-zinc-400 truncate flex-1 text-right">{edge.to}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
