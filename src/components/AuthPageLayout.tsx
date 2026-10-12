import type { ReactNode } from 'react';

interface AuthPageLayoutProps {
  readonly title: string;
  readonly description: string;
  readonly visuallyHideHeader?: boolean;
  readonly children: ReactNode;
}

export function AuthPageLayout({
  title,
  description,
  visuallyHideHeader = false,
  children,
}: AuthPageLayoutProps) {
  return (
    <div className="auth-page flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <main className="w-full max-w-[30rem]">
        <section className="auth-panel panel-surface rounded-2xl p-5 sm:p-8">
          <div className="mb-6 flex justify-center sm:mb-8">
            <img
              alt="Logo oficial do NotasMAX"
              className="auth-logo h-32 w-32 rounded-2xl bg-white object-contain p-2 sm:h-36 sm:w-36"
              height="144"
              src="/notasmax-logo.png"
              width="144"
            />
          </div>
          <div className="space-y-6">
            <header className={visuallyHideHeader ? 'sr-only' : 'space-y-2'}>
              <h1 className="text-title-large font-semibold text-on-surface">{title}</h1>
              <p className="text-body-medium leading-6 text-muted">{description}</p>
            </header>
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}
