import { CreditCard, Languages, LogOut, Palette, UserRound } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createBillingPortal, getBillingOverview } from '../api';
import { useAuth } from '../auth/AuthProvider';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { PageContainer } from '../components/PageContainer';
import { PageHeader } from '../components/PageHeader';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { useToast } from '../components/ToastProvider';
import { useT } from '../i18n';
import { formatError } from '../lib/api-error';
import { Button } from '../components/ui/Button';

type Quota = {
  limit: number | null;
  used: number;
  reserved: number;
  remaining: number | null;
  bonusAvailable?: number;
  bonusReserved?: number;
  totalRemaining?: number | null;
};

export function SettingsPage() {
  const t = useT();
  const toast = useToast();
  const { profile, signOut } = useAuth();
  const billing = useQuery({
    queryKey: ['billing-overview', profile?.id],
    queryFn: getBillingOverview,
    enabled: Boolean(profile),
  });

  async function openPortal() {
    try {
      const { url } = await createBillingPortal();
      window.location.assign(url);
    } catch (error) {
      toast.error(formatError(error, t));
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      toast.error(formatError(error, t));
    }
  }

  return (
    <PageContainer>
      <PageHeader page="settings" subtitle={t('settings.subtitle')} />

      <div className="grid max-w-3xl gap-4">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="account-avatar grid size-10 shrink-0 place-items-center rounded-full">
                <UserRound size={18} />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-zinc-200">
                  {profile?.name || profile?.email}
                </h2>
                <p className="mt-0.5 truncate text-xs text-zinc-500">
                  {profile?.email}
                  {profile?.organizationName ? ` · ${profile.organizationName}` : ''}
                </p>
              </div>
              <span className="account-role rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-wider">
                {profile?.accessRole}
              </span>
            </div>
            <Button
              type="button"
              onClick={() => void handleSignOut()}
              className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 transition hover:border-red-800 hover:bg-red-950/20 hover:text-red-300"
            >
              <LogOut size={14} />
              {t('auth.signOut')}
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <CreditCard size={20} className="mt-0.5 shrink-0 text-violet-400" />
              <div>
                <h2 className="text-sm font-semibold text-zinc-200">{t('billing.title')}</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {profile?.accessRole === 'ADMIN'
                    ? 'ADMIN'
                    : (billing.data?.plan ?? profile?.plan)}
                </p>
              </div>
            </div>
            {billing.data?.canManageBilling && billing.data.plan !== 'FREE' && (
              <Button
                type="button"
                onClick={() => void openPortal()}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                {t('billing.manageSubscription')}
              </Button>
            )}
          </div>
          {billing.data?.usage && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <QuotaMeter
                label={t('usage.promptGenerations')}
                quota={billing.data.usage.prompts}
              />
              <QuotaMeter
                label={t('usage.logoGenerations')}
                quota={billing.data.usage.logos}
              />
            </div>
          )}
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="mb-5 flex items-start gap-3">
            <Languages size={20} className="mt-0.5 shrink-0 text-violet-400" />
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">{t('settings.languageTitle')}</h2>
              <p className="mt-1 text-sm text-zinc-500">{t('settings.languageDescription')}</p>
            </div>
          </div>
          <LanguageSwitcher />
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="mb-5 flex items-start gap-3">
            <Palette size={20} className="mt-0.5 shrink-0 text-violet-400" />
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">{t('settings.themeTitle')}</h2>
              <p className="mt-1 text-sm text-zinc-500">{t('settings.themeDescription')}</p>
            </div>
          </div>
          <ThemeSwitcher />
        </section>
      </div>
    </PageContainer>
  );
}

function QuotaMeter({ label, quota }: { label: string; quota: Quota }) {
  const t = useT();
  const totalUsed = quota.used + quota.reserved;
  const percent =
    quota.limit == null || quota.limit === 0
      ? 0
      : Math.min(100, Math.round((totalUsed / quota.limit) * 100));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-zinc-300">{label}</p>
        <span className="text-xs text-zinc-500">
          {quota.limit == null
            ? t('usage.usedUnlimited', { count: totalUsed })
            : t('usage.usedOf', { used: totalUsed, limit: quota.limit })}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-violet-500 transition-all"
          style={{ width: quota.limit == null ? '100%' : `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-zinc-600">
        {quota.remaining == null
          ? t('usage.unlimited')
          : t('usage.remaining', { count: quota.remaining })}
      </p>
      {quota.bonusAvailable !== undefined && quota.limit !== null && (
        <div className="mt-3 border-t border-zinc-800 pt-3">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-zinc-500">{t('usage.bonusLogos')}</span>
            <span className="font-medium text-violet-400">
              {quota.bonusAvailable}
              {quota.bonusReserved ? ` (${t('usage.bonusReserved', { count: quota.bonusReserved })})` : ''}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-600">{t('usage.bonusLogosHint')}</p>
        </div>
      )}
    </div>
  );
}
