import { useAuth } from '../auth/AuthContext';

export function AdminHomePage() {
  const auth = useAuth();

  if (auth.state.status !== 'authenticated') {
    return null;
  }

  return (
    <section aria-labelledby="admin-home-title" className="max-w-3xl space-y-3">
      <h1 className="text-headline-small font-semibold text-on-surface" id="admin-home-title">
        Olá, {auth.state.user.displayName} 👋
      </h1>
      <p className="max-w-2xl text-body-large leading-6 text-muted">Seja bem-vindo(a) de volta!</p>
    </section>
  );
}
