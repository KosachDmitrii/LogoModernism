import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPrinciplesOverview, searchPrinciples } from '../api';
import { useAuth } from '../auth/AuthProvider';
import { PageContainer } from '../components/PageContainer';
import { PageHeader } from '../components/PageHeader';
import { useT } from '../i18n';
import { DesignBrainPage } from './DesignBrainPage';

export function BrainRoutePage() {
  const { session, profile, loading } = useAuth();
  if (loading) return null;
  if (session && profile) return <DesignBrainPage />;
  return <BrainPreviewPage />;
}

function BrainPreviewPage() {
  const t = useT();
  const overview = useQuery({
    queryKey: ['principles-overview'],
    queryFn: getPrinciplesOverview,
  });
  const sample = useQuery({
    queryKey: ['brain-preview-principles'],
    queryFn: ({ signal }) => searchPrinciples({}, signal),
  });

  return (
    <PageContainer>
      <PageHeader page="brain" subtitle={t('brain.preview.subtitle')} />
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <h2 className="text-lg font-semibold">{t('brain.preview.howItWorks')}</h2>
          <div className="mt-5 grid gap-4">
            {[
              t('brain.preview.catalogStage'),
              t('brain.preview.principlesStage'),
              t('brain.preview.reasoningStage'),
            ].map((step, index) => (
              <div key={step} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-violet-600/20 text-xs font-semibold text-violet-300">
                  {index + 1}
                </span>
                <p className="pt-1 text-sm text-zinc-300">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/register"
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
            >
              {t('auth.createAccount')}
            </Link>
            <Link
              to="/pricing"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              {t('nav.pricing')}
            </Link>
          </div>
        </section>
        <section>
          <p className="mb-3 text-sm text-zinc-500">
            {overview.data?.total ?? 0} {t('brain.preview.publicPrinciples')}
          </p>
          <div className="grid gap-3">
            {sample.data?.slice(0, 6).map((principle) => (
              <div key={principle.id} className="border-l-2 border-violet-500/50 pl-4">
                <p className="text-sm font-medium text-zinc-200">{principle.name}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">
                  {principle.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
