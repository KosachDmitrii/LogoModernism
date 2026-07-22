import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store';
import { downloadDirectionPack } from '../../lib/download-direction-pack';
import { useLocale, useT } from '../../i18n';
import { useToast } from '../ToastProvider';
import { Button } from '../ui/Button';
import { formatError } from '../../lib/api-error';

export function DownloadPackButton() {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const prompts = useAppStore((s) => s.prompts);
  const brainPartner = useAppStore((s) => s.brainPartner);
  const industry = useAppStore((s) => s.industry);
  const companyName = useAppStore((s) => s.companyName);
  const designBrief = useAppStore((s) => s.designBrief);

  if (prompts.length === 0) return null;

  const handleDownload = async () => {
    setLoading(true);
    try {
      const hasImages = prompts.some((p) => (p.logos?.length ?? 0) > 0);
      await downloadDirectionPack({
        companyName,
        industry,
        designBrief,
        prompts,
        brainPartner,
        locale,
      });
      toast.success(
        hasImages ? t('toast.packDownloaded') : t('toast.packDownloadedNoImages'),
      );
    } catch (error) {
      toast.error(formatError(error, t), { title: t('pack.downloadFailed') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={() => void handleDownload()}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-3.5 rounded-xl text-xs font-medium text-zinc-200 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
      {loading ? t('pack.downloading') : t('pack.download')}
    </Button>
  );
}
