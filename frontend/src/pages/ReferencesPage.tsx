import { Link } from 'react-router-dom';
import { PageContainer } from '../components/PageContainer';
import { PageHeader } from '../components/PageHeader';
import { useT } from '../i18n';

export function ReferencesPage() {
  const t = useT();

  return (
    <PageContainer>
      <PageHeader page="references" subtitle={t('references.subtitle')} />
      <div className="max-w-2xl space-y-8">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-200">{t('references.whatTitle')}</h2>
          <p className="text-sm leading-7 text-zinc-400">{t('references.whatBody')}</p>
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-200">{t('references.howTitle')}</h2>
          <p className="text-sm leading-7 text-zinc-400">{t('references.howBody')}</p>
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-200">{t('references.notTitle')}</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-zinc-400">
            <li>{t('references.notItem1')}</li>
            <li>{t('references.notItem2')}</li>
            <li>{t('references.notItem3')}</li>
          </ul>
        </section>
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
          <h2 className="text-base font-semibold text-zinc-200">{t('references.productTitle')}</h2>
          <p className="text-sm leading-7 text-zinc-400">{t('references.productBody')}</p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              to="/logo-catalog"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
            >
              {t('home.exploreCatalog')}
            </Link>
            <Link
              to="/principles"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
            >
              {t('nav.principles')}
            </Link>
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
