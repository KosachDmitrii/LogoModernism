import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { DesignBrainPage } from './pages/DesignBrainPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DesignBrainPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
