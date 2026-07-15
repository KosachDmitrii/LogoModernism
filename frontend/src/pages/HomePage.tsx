import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { PageContainer } from '../components/PageContainer';
import { PageHeader } from '../components/PageHeader';
import { useT } from '../i18n';

export function HomePage() {
  const t = useT();
  const { profile } = useAuth();

  return (
    <PageContainer>
      <PageHeader page="home" subtitle={t('home.subtitle')} />
      <section className="max-w-3xl">
        <h2 className="text-3xl font-semibold leading-tight text-zinc-100">
          {t('home.title')}
        </h2>
        <p className="mt-4 text-base leading-7 text-zinc-400">{t('home.description')}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            to={profile ? '/prompts' : '/register'}
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
      <section className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          ['/logo-catalog', 'home.catalogTitle', 'home.catalogDescription'],
          ['/principles', 'home.principlesTitle', 'home.principlesDescription'],
          ['/brain', 'home.brainTitle', 'home.brainDescription'],
        ].map(([to, title, description]) => (
          <Link
            key={to}
            to={to}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition hover:border-zinc-700"
          >
            <h3 className="font-semibold text-zinc-200">{t(title as never)}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500">{t(description as never)}</p>
          </Link>
        ))}
      </section>
    </PageContainer>
  );
}
