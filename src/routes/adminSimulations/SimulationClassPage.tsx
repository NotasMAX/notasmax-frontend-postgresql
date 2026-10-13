import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { loadAdminClasses, type AdminClassOption } from '../../api/adminAcademicCatalog';
import { GENERIC_API_ERROR_MESSAGE, getApiProblemPresentation } from '../../api/problemDetails';
import { Badge } from '../../components/Badge';
import { classLabel } from '../adminAccounts/accountUi';

export function SimulationClassPage() {
  const [classes, setClasses] = useState<AdminClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadAdminClasses()
      .then((items) => {
        if (active)
          setClasses(
            items.sort(
              (left, right) => right.schoolYear - left.schoolYear || left.series - right.series,
            ),
          );
      })
      .catch((reason: unknown) => {
        if (active)
          setError(getApiProblemPresentation(reason).message ?? GENERIC_API_ERROR_MESSAGE);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section aria-labelledby="simulation-classes-title" className="space-y-5">
      <div>
        <p className="text-label-large font-semibold uppercase tracking-wide text-primary">
          Administração
        </p>
        <h1
          className="mt-2 text-headline-small font-semibold text-on-surface"
          id="simulation-classes-title"
        >
          Simulados por turma
        </h1>
        <p className="mt-2 max-w-3xl text-body-large leading-6 text-muted">
          Escolha uma turma para consultar os simulados e acompanhar seu ciclo.
        </p>
      </div>
      {loading && (
        <p aria-live="polite" className="text-body-large text-muted" role="status">
          Carregando turmas…
        </p>
      )}
      {error && (
        <p
          className="rounded-lg border border-danger bg-error-surface p-4 text-body-medium text-danger"
          role="alert"
        >
          {error}
        </p>
      )}
      {!loading && !error && classes.length === 0 && (
        <div className="panel-surface rounded-2xl bg-surface p-6">
          <p className="text-body-large text-on-surface">Nenhuma turma disponível para consulta.</p>
        </div>
      )}
      {!loading && !error && classes.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {classes.map((schoolClass) => (
            <li
              className="panel-surface flex flex-col gap-4 rounded-2xl bg-surface p-5"
              key={schoolClass.classId}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-title-medium font-semibold text-on-surface">
                    {classLabel(schoolClass)}
                  </h2>
                  <p className="mt-1 text-body-medium text-muted">
                    Ano letivo {schoolClass.schoolYear}
                  </p>
                </div>
                {schoolClass.isClosed && <Badge tone="warning">Fechada</Badge>}
              </div>
              <Link
                className="account-button-secondary inline-flex min-h-11 items-center justify-center rounded-lg border border-panel-outline px-4 text-label-large font-medium text-primary hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                to={`/admin/turmas/${encodeURIComponent(schoolClass.classId)}/simulados`}
              >
                {schoolClass.isClosed ? 'Consultar histórico' : 'Ver simulados'}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
