import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <section className="space-y-4">
      <p className="text-label-large uppercase text-primary">404</p>
      <h1 className="text-headline-small text-on-surface">Página não encontrada</h1>
      <p className="text-body-large text-muted">
        O endereço informado não corresponde a uma rota desta aplicação.
      </p>
      <Link
        className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-label-large font-medium text-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        to="/"
      >
        Voltar para entrar
      </Link>
    </section>
  );
}
