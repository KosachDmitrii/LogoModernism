import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { createBillingCheckout, getBillingOverview } from '../api';
import { useAuth } from '../auth/AuthProvider';
import { PageContainer } from '../components/PageContainer';
import { PageHeader } from '../components/PageHeader';
import { useT } from '../i18n';

export function PricingPage() {
  const t = useT();
  const { profile, activeMembership } = useAuth();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const billing = useQuery({
    queryKey: ['billing-overview', activeMembership?.organization.id],
    queryFn: getBillingOverview,
    enabled: Boolean(profile && activeMembership),
  });

  async function upgrade() {
    setCheckoutError(null);
    setCheckoutLoading(true);
    try {
      const { url } = await createBillingCheckout('PRO');
      window.location.assign(url);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : t('pricing.checkoutFailed'));
      setCheckoutLoading(false);
    }
  }

  const currentPlan = billing.data?.plan ?? activeMembership?.organization.plan;
  const canManage =
    activeMembership?.role === 'OWNER' || activeMembership?.role === 'ADMIN';

  return (
    <PageContainer>
      <PageHeader page="pricing" subtitle={t('pricing.subtitle')} />
      <div className="grid gap-5 lg:grid-cols-3">
        <PlanCard
          title="Free"
          price="$0"
          description={t('pricing.freeDescription')}
          features={[
            t('pricing.freeCredits'),
            t('pricing.publicCatalog'),
            t('pricing.savedPrompts'),
          ]}
          current={currentPlan === 'FREE'}
        >
          {!profile && (
            <Link className="text-sm font-medium text-violet-400" to="/register">
              {t('pricing.startFree')}
            </Link>
          )}
        </PlanCard>
        <PlanCard
          title="Pro"
          price="$19"
          suffix={t('pricing.perMonth')}
          description={t('pricing.proDescription')}
          features={[
            t('pricing.proCredits'),
            t('pricing.advancedBrain'),
            t('pricing.priorityGeneration'),
          ]}
          current={currentPlan === 'PRO'}
          featured
        >
          {!profile ? (
            <Link className="text-sm font-medium text-violet-300" to="/register?plan=pro">
              {t('auth.createAccount')}
            </Link>
          ) : canManage && currentPlan !== 'PRO' ? (
            <button
              type="button"
              disabled={checkoutLoading}
              onClick={() => void upgrade()}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {checkoutLoading ? t('pricing.checkoutLoading') : t('pricing.upgrade')}
            </button>
          ) : !canManage ? (
            <span className="text-sm text-zinc-500">{t('pricing.askOwner')}</span>
          ) : null}
        </PlanCard>
        <PlanCard
          title="Enterprise"
          price={t('pricing.custom')}
          description={t('pricing.enterpriseDescription')}
          features={[
            t('pricing.customLimits'),
            t('pricing.teamWorkspaces'),
            t('pricing.support'),
          ]}
          current={currentPlan === 'ENTERPRISE'}
        >
          <a className="text-sm font-medium text-violet-400" href="mailto:support@logomodernism.app">
            {t('pricing.contactSales')}
          </a>
        </PlanCard>
      </div>
      {checkoutError && (
        <p className="mt-5 rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-300">
          {checkoutError}
        </p>
      )}
    </PageContainer>
  );
}

function PlanCard({
  title,
  price,
  suffix,
  description,
  features,
  current,
  featured,
  children,
}: {
  title: string;
  price: string;
  suffix?: string;
  description: string;
  features: string[];
  current: boolean;
  featured?: boolean;
  children?: ReactNode;
}) {
  return (
    <article
      className={`rounded-2xl border p-6 ${
        featured ? 'border-violet-600 bg-violet-950/20' : 'border-zinc-800 bg-zinc-900/50'
      }`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {current && (
          <span className="rounded-full bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
            Current
          </span>
        )}
      </div>
      <p className="mt-4 text-3xl font-semibold">
        {price} <span className="text-sm font-normal text-zinc-500">{suffix}</span>
      </p>
      <p className="mt-3 min-h-12 text-sm leading-6 text-zinc-400">{description}</p>
      <ul className="my-6 grid gap-2 text-sm text-zinc-300">
        {features.map((feature) => (
          <li key={feature}>— {feature}</li>
        ))}
      </ul>
      {children}
    </article>
  );
}
