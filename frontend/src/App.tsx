import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { HomePage } from './pages/HomePage';
import { PromptsPage } from './pages/PromptsPage';
import { SavedPromptsPage } from './pages/SavedPromptsPage';
import { LogoCatalogPage } from './pages/LogoCatalogPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { PrinciplesPage } from './pages/PrinciplesPage';
import { BrainRoutePage } from './pages/BrainRoutePage';
import { PricingPage } from './pages/PricingPage';
import { useAuth } from './auth/AuthProvider';
import { useT } from './i18n';

export default function App() {
  const { loading } = useAuth();
  const t = useT();

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-zinc-950 text-zinc-400">
        {t('auth.loading')}
      </main>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="logo-catalog" element={<LogoCatalogPage />} />
          <Route path="principles" element={<PrinciplesPage />} />
          <Route path="brain" element={<BrainRoutePage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="prompts" element={<PromptsPage />} />
            <Route path="saved" element={<SavedPromptsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
