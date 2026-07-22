import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { CaseStudies } from '../components/home/CaseStudies';
import { PageContainer } from '../components/PageContainer';
import { PageHeader } from '../components/PageHeader';
import { useT, type MessageKey } from '../i18n';

const STEPS: Array<{ title: MessageKey; body: MessageKey }> = [
  { title: 'home.step1Title', body: 'home.step1Body' },
  { title: 'home.step2Title', body: 'home.step2Body' },
  { title: 'home.step3Title', body: 'home.step3Body' },
  { title: 'home.step4Title', body: 'home.step4Body' },
];

export function HomePage() {
  const t = useT();
  const { profile } = useAuth();
  const createTo = profile ? '/prompts' : '/register';

  return (
    <PageContainer>
      <PageHeader page="home" subtitle={t('home.subtitle')} />

      <section className="max-w-3xl">
        <p className="text-sm font-medium tracking-wide text-violet-400/90">{t('home.forWhom')}</p>
        <h2 className="mt-2 text-3xl font-semibold leading-tight text-zinc-100">
          {t('home.title')}
        </h2>
        <p className="mt-4 text-base leading-7 text-zinc-400">{t('home.description')}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            to={createTo}
            className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
          >
            {profile ? t('home.startCreating') : t('auth.createAccount')}
          </Link>
          <Link
            to="/logo-catalog"
            className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-900"
          >
            {t('home.exploreCatalog')}
          </Link>
        </div>
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h3 className="text-sm font-semibold text-zinc-300">{t('home.compareGenericTitle')}</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-500">{t('home.compareGenericBody')}</p>
        </div>
        <div className="rounded-xl border border-violet-900/50 bg-violet-950/20 p-5">
          <h3 className="text-sm font-semibold text-zinc-200">{t('home.compareOursTitle')}</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{t('home.compareOursBody')}</p>
        </div>
      </section>

      <CaseStudies />

      <section className="mt-14">
        <h3 className="text-lg font-semibold text-zinc-200">{t('home.howTitle')}</h3>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500">{t('home.howSubtitle')}</p>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4"
            >
              <span className="font-mono text-xs text-zinc-600">{index + 1}</span>
              <p className="mt-2 text-sm font-medium text-zinc-200">{t(step.title)}</p>
              <p className="mt-1.5 text-xs leading-5 text-zinc-500">{t(step.body)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 md:p-6">
        <h3 className="text-lg font-semibold text-zinc-200">{t('home.packTitle')}</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">{t('home.packBody')}</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 text-sm text-zinc-400">
          <li>{t('home.packItemGuidelines')}</li>
          <li>{t('home.packItemPresentation')}</li>
          <li>{t('home.packItemConstruction')}</li>
          <li>{t('home.packItemUsage')}</li>
          <li>{t('home.packItemColor')}</li>
          <li>{t('home.packItemImages')}</li>
        </ul>
      </section>

      <section className="mt-14 grid gap-4 md:grid-cols-3">
        {(
          [
            ['/logo-catalog', 'home.catalogTitle', 'home.catalogDescription'],
            ['/principles', 'home.principlesTitle', 'home.principlesDescription'],
            ['/references', 'home.referencesTitle', 'home.referencesDescription'],
          ] as const
        ).map(([to, title, description]) => (
          <Link
            key={to}
            to={to}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition hover:border-zinc-700"
          >
            <h3 className="font-semibold text-zinc-200">{t(title)}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500">{t(description)}</p>
          </Link>
        ))}
      </section>

      <section className="mt-12 rounded-xl border border-zinc-800 bg-zinc-900/30 px-5 py-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-zinc-200">{t('home.ctaTitle')}</p>
          <p className="mt-1 text-sm text-zinc-500">{t('home.ctaBody')}</p>
        </div>
        <Link
          to={createTo}
          className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
        >
          {t('home.startCreating')}
        </Link>
      </section>
    </PageContainer>
  );
}
