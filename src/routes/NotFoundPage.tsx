import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen grid-cols-1 place-items-center bg-surface-container px-4 py-8">
      <section
        aria-labelledby="not-found-title"
        className="panel-surface flex w-full max-w-xl flex-col items-center gap-5 rounded-2xl bg-surface p-6 text-center sm:p-8"
      >
        <img
          alt="Logo oficial do NotasMAX"
          className="h-32 w-32 rounded-2xl bg-white object-contain p-2"
          height="128"
          src="/notasmax-logo.png"
          width="128"
        />
        <p aria-hidden="true" className="text-display-large text-primary">
          404
        </p>
        <h1 className="text-headline-small font-semibold text-on-surface" id="not-found-title">
          Página não encontrada
        </h1>
        <p className="max-w-prose text-body-large leading-6 text-muted">
          O endereço informado não corresponde a uma rota desta aplicação.
        </p>
        <Link
          className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-label-large font-semibold text-on-primary hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          to="/"
        >
          Voltar para entrar
        </Link>
      </section>
    </main>
  );
}
