import type { ReactNode } from 'react';
import { AcademicSectionNavigation } from './AcademicSectionNavigation';

interface AcademicPageLayoutProps {
  readonly title: string;
  readonly description: ReactNode;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}

export function AcademicPageLayout({
  title,
  description,
  actions,
  children,
}: AcademicPageLayoutProps) {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-label-large font-semibold uppercase tracking-wide text-primary">
          Estrutura acadêmica
        </p>
        <h1 className="text-headline-medium font-semibold text-on-surface">{title}</h1>
        <p className="max-w-3xl text-body-large leading-6 text-muted">{description}</p>
        <AcademicSectionNavigation />
      </header>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      {children}
    </section>
  );
}
