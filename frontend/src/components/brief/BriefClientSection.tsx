import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useAppStore } from '../../store';
import { useT } from '../../i18n';
import { useToast } from '../ToastProvider';
import { Button } from '../ui/Button';

export function BriefClientSection({ onStepComplete }: { onStepComplete?: () => void }) {
  const t = useT();
  const toast = useToast();
  const designBrief = useAppStore((s) => s.designBrief);
  const updateDesignBrief = useAppStore((s) => s.updateDesignBrief);
  const [draft, setDraft] = useState(designBrief.clientNotes);

  useEffect(() => {
    setDraft(designBrief.clientNotes);
  }, [designBrief.clientNotes]);

  const applyNotes = () => {
    const trimmed = draft.trim();
    const sources = designBrief.sources.includes('Client brief')
      ? designBrief.sources
      : [...designBrief.sources, 'Client brief'];
    updateDesignBrief({ clientNotes: trimmed, sources });
    toast.success(t('toast.clientNotesApplied'));
    onStepComplete?.();
  };

  const dirty = draft.trim() !== designBrief.clientNotes.trim();

  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      <div>
        <label htmlFor="brief-client-notes" className="block text-xs text-zinc-500 mb-1">
          {t('brief.client.label')}
        </label>
        <textarea
          id="brief-client-notes"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder={t('brief.client.placeholder')}
          className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600 resize-none"
        />
      </div>

      <Button
        type="button"
        disabled={!dirty}
        onClick={applyNotes}
        className="w-full px-3 py-2 rounded-lg bg-zinc-100 text-zinc-900 hover:bg-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <MessageCircle size={14} />
        {t('brief.client.apply')}
      </Button>

      <p className="text-xs text-zinc-600 leading-relaxed">{t('brief.client.hint')}</p>
    </div>
  );
}
