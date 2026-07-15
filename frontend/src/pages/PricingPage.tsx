import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, PackagePlus } from 'lucide-react';
import type { LogoAddonPack } from '@logo-platform/shared';
import { createBillingCheckout, createLogoAddonCheckout, getBillingOverview } from '../api';
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
  const [checkoutLoading, setCheckoutLoading] = useState<
    'PLUS' | 'PRO' | LogoAddonPack | null
  >(null);
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

  async function buyLogoPack(pack: LogoAddonPack) {
    setCheckoutLoading(pack);
    try {
      const { url } = await createLogoAddonCheckout(pack);
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
          price="$12.99"
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
          price="$29.99"
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
      {canManage && (
        <section className="mt-8">
          <div className="mb-4 flex items-start gap-3">
            <PackagePlus size={20} className="mt-0.5 shrink-0 text-violet-400" />
            <div>
              <h2 className="text-lg font-semibold text-zinc-200">{t('pricing.addonsTitle')}</h2>
              <p className="mt-1 text-sm text-zinc-500">{t('pricing.addonsDescription')}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <LogoPackCard
              generations={10}
              price="$4.99"
              loading={checkoutLoading === 'LOGOS_10'}
              disabled={checkoutLoading !== null}
              onBuy={() => void buyLogoPack('LOGOS_10')}
            />
            <LogoPackCard
              generations={25}
              price="$9.99"
              loading={checkoutLoading === 'LOGOS_25'}
              disabled={checkoutLoading !== null}
              onBuy={() => void buyLogoPack('LOGOS_25')}
            />
          </div>
        </section>
      )}
    </PageContainer>
  );
}

function LogoPackCard({
  generations,
  price,
  loading,
  disabled,
  onBuy,
}: {
  generations: number;
  price: string;
  loading: boolean;
  disabled: boolean;
  onBuy: () => void;
}) {
  const t = useT();
  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-200">
            {t('pricing.logoPack', { count: generations })}
          </h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">{t('pricing.logoPackHint')}</p>
        </div>
        <span className="text-xl font-semibold text-zinc-100">{price}</span>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onBuy}
        className="pricing-secondary-action mt-5 disabled:opacity-60"
      >
        {loading ? t('pricing.checkoutLoading') : t('pricing.buyPack')}
      </button>
    </article>
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
