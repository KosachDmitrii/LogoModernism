import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { createBillingCheckout, getBillingOverview } from '../api';
import { useAuth } from '../auth/AuthProvider';
import { PageContainer } from '../components/PageContainer';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/ToastProvider';
import { useT } from '../i18n';
import { formatError } from '../lib/api-error';

export function PricingPage() {
  const t = useT();
  const toast = useToast();
  const { profile } = useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState<'PLUS' | 'PRO' | null>(null);
  const billing = useQuery({
    queryKey: ['billing-overview', profile?.id],
    queryFn: getBillingOverview,
    enabled: Boolean(profile),
  });

  async function upgrade(plan: 'PLUS' | 'PRO') {
    setCheckoutLoading(plan);
    try {
      const { url } = await createBillingCheckout(plan);
      window.location.assign(url);
    } catch (error) {
      toast.error(formatError(error, t));
      setCheckoutLoading(null);
    }
  }

  const currentPlan = billing.data?.plan ?? profile?.plan;
  const canManage = profile?.accessRole === 'USER';

  return (
    <PageContainer>
      <PageHeader page="pricing" subtitle={t('pricing.subtitle')} />
      <div className="grid gap-5 lg:grid-cols-3">
        <PlanCard
          title="Free"
          price="$0"
          description={t('pricing.freeDescription')}
          features={[
            t('pricing.freePrompts'),
            t('pricing.freeLogos'),
            t('pricing.publicCatalog'),
          ]}
          current={currentPlan === 'FREE'}
        >
          {!profile && (
            <Link className="pricing-secondary-action" to="/register">
              {t('pricing.startFree')}
            </Link>
          )}
        </PlanCard>
        <PlanCard
          title="Plus"
          price="$9"
          suffix={t('pricing.perMonth')}
          description={t('pricing.plusDescription')}
          features={[
            t('pricing.plusPrompts'),
            t('pricing.plusLogos'),
            t('pricing.advancedBrain'),
          ]}
          current={currentPlan === 'PLUS'}
          featured
        >
          {!profile ? (
            <Link className="pricing-primary-action" to="/register?plan=plus">
              {t('auth.createAccount')}
            </Link>
          ) : canManage && currentPlan !== 'PLUS' ? (
            <button
              type="button"
              disabled={checkoutLoading !== null}
              onClick={() => void upgrade('PLUS')}
              className="pricing-primary-action disabled:opacity-60"
            >
              {checkoutLoading === 'PLUS' ? t('pricing.checkoutLoading') : t('pricing.upgradePlus')}
            </button>
          ) : !canManage ? (
            <span className="text-sm text-zinc-500">{t('pricing.adminUnlimited')}</span>
          ) : null}
        </PlanCard>
        <PlanCard
          title="Pro"
          price="$19"
          suffix={t('pricing.perMonth')}
          description={t('pricing.proDescription')}
          features={[
            t('pricing.proPrompts'),
            t('pricing.proLogos'),
            t('pricing.priorityGeneration'),
          ]}
          current={currentPlan === 'PRO'}
        >
          {!profile ? (
            <Link className="pricing-secondary-action" to="/register?plan=pro">
              {t('auth.createAccount')}
            </Link>
          ) : canManage && currentPlan !== 'PRO' ? (
            <button
              type="button"
              disabled={checkoutLoading !== null}
              onClick={() => void upgrade('PRO')}
              className="pricing-secondary-action disabled:opacity-60"
            >
              {checkoutLoading === 'PRO' ? t('pricing.checkoutLoading') : t('pricing.upgradePro')}
            </button>
          ) : !canManage ? (
            <span className="text-sm text-zinc-500">{t('pricing.adminUnlimited')}</span>
          ) : null}
        </PlanCard>
      </div>
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
  const t = useT();

  return (
    <article
      className={`pricing-plan-card ${featured ? 'pricing-plan-card-featured' : ''}`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-200">{title}</h2>
        {current && (
          <span className="pricing-current-badge">
            {t('pricing.current')}
          </span>
        )}
      </div>
      <p className="mt-5 text-3xl font-semibold text-zinc-100">
        {price} <span className="text-sm font-normal text-zinc-500">{suffix}</span>
      </p>
      <p className="mt-3 min-h-12 text-sm leading-6 text-zinc-500">{description}</p>
      <ul className="my-6 grid gap-3 text-sm text-zinc-400">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <span className="pricing-feature-icon">
              <Check size={12} strokeWidth={2.5} />
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      {children && <div className="mt-auto pt-1">{children}</div>}
    </article>
  );
}
