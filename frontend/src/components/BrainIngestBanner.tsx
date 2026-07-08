import { Loader2, CheckCircle2, AlertCircle, X, FileText } from 'lucide-react';
import {
  useBrainIngestStore,
  useIsBrainIngesting,
  type BrainIngestJob,
} from '../stores/brain-ingest-store';

export function BrainIngestBanner() {
  const jobs = useBrainIngestStore((s) => s.jobs);
  const isIngesting = useIsBrainIngesting();
  const dismissJob = useBrainIngestStore((s) => s.dismissJob);
  const clearFinished = useBrainIngestStore((s) => s.clearFinishedJobs);

  const visible = jobs.filter(
    (job) =>
      job.status === 'checking' ||
      job.status === 'uploading' ||
      job.status === 'processing' ||
      job.status === 'done' ||
      job.status === 'skipped' ||
      job.status === 'error',
  );

  if (!visible.length) return null;

  const finishedCount = visible.filter(
    (j) => j.status === 'done' || j.status === 'skipped' || j.status === 'error',
  ).length;

  return (
    <div className="border-b border-zinc-800 bg-zinc-950/95 backdrop-blur px-4 py-2 space-y-1.5">
      {visible.map((job) => (
        <JobRow key={job.id} job={job} onDismiss={() => dismissJob(job.id)} />
      ))}
      {!isIngesting && finishedCount > 1 && (
        <button
          type="button"
          onClick={clearFinished}
          className="text-[10px] text-zinc-500 hover:text-zinc-300"
        >
          Clear finished
        </button>
      )}
    </div>
  );
}

function JobRow({ job, onDismiss }: { job: BrainIngestJob; onDismiss: () => void }) {
  const isActive =
    job.status === 'checking' || job.status === 'uploading' || job.status === 'processing';

  const icon = isActive ? (
    <Loader2 size={14} className="animate-spin text-violet-400 shrink-0" />
  ) : job.status === 'done' ? (
    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
  ) : job.status === 'skipped' ? (
    <FileText size={14} className="text-amber-400 shrink-0" />
  ) : (
    <AlertCircle size={14} className="text-red-400 shrink-0" />
  );

  const detail =
    job.result && job.status === 'done'
      ? `${job.result.chunksStored} chunks, ${job.result.principlesExtracted} principles`
      : job.message;

  return (
    <div className="flex items-start gap-2 text-xs">
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-zinc-200 truncate">
          <span className="text-zinc-500">PDF:</span> {job.title}
          {isActive && <span className="text-violet-400 ml-1">— in progress</span>}
        </p>
        {detail && <p className="text-zinc-500 truncate">{detail}</p>}
      </div>
      {!isActive && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-zinc-600 hover:text-zinc-300 shrink-0 p-0.5"
          aria-label="Dismiss"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
