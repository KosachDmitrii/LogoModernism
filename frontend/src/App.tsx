import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { HomePage } from './pages/HomePage';
import { DesignBrainPage } from './pages/DesignBrainPage';
import { PromptsPage } from './pages/PromptsPage';
import { SavedPromptsPage } from './pages/SavedPromptsPage';
import { LogoCatalogPage } from './pages/LogoCatalogPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="prompts" element={<PromptsPage />} />
          <Route path="logo-catalog" element={<LogoCatalogPage />} />
          <Route path="saved" element={<SavedPromptsPage />} />
          <Route path="brain" element={<DesignBrainPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
