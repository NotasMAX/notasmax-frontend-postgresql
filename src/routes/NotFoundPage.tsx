import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <section className="space-y-4">
      <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">404</p>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
        Página não encontrada
      </h1>
      <p className="text-base leading-7 text-slate-600">
        O endereço informado não corresponde a uma rota desta aplicação.
      </p>
      <Link
        className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        to="/"
      >
        Voltar ao início
      </Link>
    </section>
  );
}
