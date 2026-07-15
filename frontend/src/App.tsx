import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { HomePage } from './pages/HomePage';
import { DesignBrainPage } from './pages/DesignBrainPage';
import { PromptsPage } from './pages/PromptsPage';
import { SavedPromptsPage } from './pages/SavedPromptsPage';
import { LogoCatalogPage } from './pages/LogoCatalogPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProtectedRoute } from './auth/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="prompts" element={<PromptsPage />} />
            <Route path="logo-catalog" element={<LogoCatalogPage />} />
            <Route path="saved" element={<SavedPromptsPage />} />
            <Route path="brain" element={<DesignBrainPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
