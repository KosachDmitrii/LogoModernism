import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { PromptsPage } from './pages/PromptsPage';
import { BrandDNAPage } from './pages/BrandDNAPage';
import { GeometryPage } from './pages/GeometryPage';
import { KnowledgeGraphPage } from './pages/KnowledgeGraphPage';
import { PipelinePage } from './pages/PipelinePage';
import { CriticPage } from './pages/CriticPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="prompts" element={<PromptsPage />} />
          <Route path="brand-dna" element={<BrandDNAPage />} />
          <Route path="geometry" element={<GeometryPage />} />
          <Route path="knowledge-graph" element={<KnowledgeGraphPage />} />
          <Route path="pipeline" element={<PipelinePage />} />
          <Route path="critic" element={<CriticPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
