import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Heart, Loader2, ThumbsDown, ThumbsUp } from 'lucide-react';
import clsx from 'clsx';
import { listSavedPrompts } from '../api';
import { PageContainer } from '../components/PageContainer';
import { PageHeader } from '../components/PageHeader';
import { PromptCard } from '../components/PromptCard';

type SavedFilter = 'all' | 'like' | 'dislike';

const FILTERS: Array<{ id: SavedFilter; label: string; icon: typeof Heart }> = [
  { id: 'all', label: 'All', icon: Heart },
  { id: 'like', label: 'Liked', icon: ThumbsUp },
  { id: 'dislike', label: 'Disliked', icon: ThumbsDown },
];

function formatSavedAt(value?: string) {
  if (!value) return '';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SavedPromptsPage() {
  const [filter, setFilter] = useState<SavedFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['saved-prompts', filter],
    queryFn: () => listSavedPrompts(filter),
  });

  const prompts = data?.prompts ?? [];
  const likedCount = prompts.filter((p) => p.feedback === 'LIKE').length;
  const dislikedCount = prompts.filter((p) => p.feedback === 'DISLIKE').length;

  return (
    <PageContainer>
      <PageHeader
        page="saved"
        subtitle="Prompts you liked or disliked — stored in the database and fed back into Brain."
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setFilter(id);
              setSelectedId(null);
            }}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              filter === id
                ? 'bg-violet-900/40 border-violet-700/50 text-violet-200'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700',
            )}
          >
            <Icon size={13} />
            {label}
            {id === 'like' && filter === 'all' && likedCount > 0 && (
              <span className="text-[10px] text-zinc-500">({likedCount})</span>
            )}
            {id === 'dislike' && filter === 'all' && dislikedCount > 0 && (
              <span className="text-[10px] text-zinc-500">({dislikedCount})</span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-zinc-500">
          <Loader2 size={18} className="animate-spin" />
          Loading saved prompts…
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-6 text-center">
          <p className="text-sm text-red-300">
            {error instanceof Error ? error.message : 'Failed to load saved prompts'}
          </p>
        </div>
      ) : prompts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl border border-zinc-800 flex items-center justify-center mb-4">
            <Heart size={24} className="text-zinc-600" />
          </div>
          <h2 className="text-lg font-medium text-zinc-300 mb-2">No saved prompts yet</h2>
          <p className="text-sm text-zinc-500 max-w-sm">
            Go to Prompts, generate variations, and tap Like or Dislike on any card. They will
            appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl mx-auto w-full">
          <p className="text-sm text-zinc-400">
            {data?.total ?? prompts.length} prompt{(data?.total ?? prompts.length) === 1 ? '' : 's'}
          </p>
          {prompts.map((prompt) => (
            <div key={prompt.id} className="space-y-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-1 text-[11px] text-zinc-500">
                {prompt.companyName && (
                  <span>
                    <span className="text-zinc-600">Company:</span> {prompt.companyName}
                  </span>
                )}
                <span>
                  <span className="text-zinc-600">Industry:</span> {prompt.industry}
                </span>
                {prompt.savedAt && (
                  <span>
                    <span className="text-zinc-600">Saved:</span> {formatSavedAt(prompt.savedAt)}
                  </span>
                )}
              </div>
              <PromptCard
                prompt={prompt}
                rank={prompt.rank ?? undefined}
                selected={selectedId === prompt.id}
                onSelect={() => setSelectedId((current) => (current === prompt.id ? null : prompt.id))}
                standalone
                onStateChange={() => refetch()}
              />
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
