import { PageContainer } from '../components/PageContainer';
import { PageHeader } from '../components/PageHeader';
import { useT } from '../i18n';

export function HomePage() {
  const t = useT();

  return (
    <PageContainer>
      <PageHeader page="home" subtitle={t('home.subtitle')} />
    </PageContainer>
  );
}
