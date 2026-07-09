import { PageContainer } from '../components/PageContainer';
import { PageHeader } from '../components/PageHeader';

export function HomePage() {
  return (
    <PageContainer>
      <PageHeader
        page="home"
        subtitle="Use the sidebar to open admin tools."
      />
    </PageContainer>
  );
}
