import { CreditCard, Languages, LogOut, Palette, UserRound } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createBillingPortal, getBillingOverview } from '../api';
import { useAuth } from '../auth/AuthProvider';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { PageContainer } from '../components/PageContainer';
import { PageHeader } from '../components/PageHeader';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { useT } from '../i18n';

export function SettingsPage() {
  const t = useT();
  const { profile, activeMembership, signOut } = useAuth();
  const billing = useQuery({
    queryKey: ['billing-overview', activeMembership?.organization.id],
    queryFn: getBillingOverview,
    enabled: Boolean(activeMembership),
  });

  async function openPortal() {
    const { url } = await createBillingPortal();
    window.location.assign(url);
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
                  {profile?.email} · {activeMembership?.organization.name}
                </p>
              </div>
              <span className="account-role rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-wider">
                {activeMembership?.role}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 transition hover:border-red-800 hover:bg-red-950/20 hover:text-red-300"
            >
              <LogOut size={14} />
              {t('auth.signOut')}
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <CreditCard size={20} className="mt-0.5 shrink-0 text-violet-400" />
              <div>
                <h2 className="text-sm font-semibold text-zinc-200">{t('billing.title')}</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {billing.data?.plan ?? activeMembership?.organization.plan} ·{' '}
                  {billing.data?.usage.remainingCredits == null
                    ? t('usage.unlimited')
                    : t('usage.creditsRemaining', {
                        count: billing.data?.usage.remainingCredits ?? 0,
                      })}
                </p>
              </div>
            </div>
            {billing.data?.canManageBilling && billing.data.plan !== 'FREE' && (
              <button
                type="button"
                onClick={() => void openPortal()}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                {t('billing.manageSubscription')}
              </button>
            )}
          </div>
          {billing.data?.usage.includedCredits != null && (
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full bg-violet-500"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(
                      100,
                      ((billing.data.usage.includedCredits -
                        billing.data.usage.committedCredits -
                        billing.data.usage.reservedCredits) /
                        billing.data.usage.includedCredits) *
                        100,
                    ),
                  )}%`,
                }}
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
