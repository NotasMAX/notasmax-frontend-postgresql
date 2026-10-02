import { BrowserRouter, Route, Routes } from 'react-router';
import { AppLayout } from '../components/AppLayout';
import { ExamplePage } from '../routes/ExamplePage';
import { HomePage } from '../routes/HomePage';
import { NotFoundPage } from '../routes/NotFoundPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="exemplo" element={<ExamplePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
