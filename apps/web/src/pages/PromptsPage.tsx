import { InputPanel } from '../components/InputPanel';
import { PromptCard } from '../components/PromptCard';
import { useAppStore } from '../store';

export function PromptsPage() {
  const prompts = useAppStore((s) => s.prompts);
  const selectedPromptId = useAppStore((s) => s.selectedPromptId);
  const selectPrompt = useAppStore((s) => s.selectPrompt);

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <div className="grid lg:grid-cols-[380px_1fr] gap-10">
        <aside className="lg:sticky lg:top-10 lg:self-start">
          <InputPanel />
        </aside>
        <section>
          {prompts.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="w-16 h-16 rounded-2xl border border-zinc-800 flex items-center justify-center mb-4">
                <div className="w-8 h-8 rounded-full border-2 border-zinc-600" />
              </div>
              <h2 className="text-lg font-medium text-zinc-300 mb-2">Knowledge Base → Rules → Prompt</h2>
              <p className="text-sm text-zinc-500 max-w-md">
                Enter an industry to analyze design principles, compose optimized prompts,
                and generate variations.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-sm font-medium text-zinc-400">{prompts.length} prompts ranked by quality</h2>
              {prompts.map((prompt, i) => (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  rank={i + 1}
                  selected={selectedPromptId === prompt.id}
                  onSelect={() => selectPrompt(prompt.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
