import { lazy, Suspense } from 'react';
import { Route } from 'react-router';

const DesignSystemGalleryPage = lazy(() =>
  import('../routes/DesignSystemGalleryPage').then((module) => ({
    default: module.DesignSystemGalleryPage,
  })),
);

export const developmentRoutes = [
  <Route
    key="design-system-gallery"
    path="docs/design-system"
    element={
      <Suspense
        fallback={
          <main aria-live="polite" className="p-6 text-body-large text-on-surface" role="status">
            Carregando a documentação do design system…
          </main>
        }
      >
        <DesignSystemGalleryPage />
      </Suspense>
    }
  />,
];
