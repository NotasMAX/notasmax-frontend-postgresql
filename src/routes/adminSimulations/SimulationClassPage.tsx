import { useEffect, useState } from 'react';
import { loadAdminClasses, type AdminClassOption } from '../../api/adminAcademicCatalog';
import { GENERIC_API_ERROR_MESSAGE, getApiProblemPresentation } from '../../api/problemDetails';
import { ActionLink } from '../../components/ActionLink';
import { Badge } from '../../components/Badge';
import { SelectField } from '../../components/SelectField';
import { classLabel } from '../adminAccounts/accountUi';

export function SimulationClassPage() {
  const [classes, setClasses] = useState<AdminClassOption[]>([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(() => new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadAdminClasses()
      .then((items) => {
        if (active)
          setClasses(
            [...items].sort(
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

  const currentSchoolYear = new Date().getFullYear();
  const availableSchoolYears = [
    ...new Set([...classes.map(({ schoolYear }) => schoolYear), currentSchoolYear]),
  ].sort((left, right) => right - left);
  const visibleClasses = classes.filter(({ schoolYear }) => schoolYear === selectedSchoolYear);

  return (
    <section aria-labelledby="simulation-classes-title" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-label-large font-semibold uppercase tracking-wide text-primary">
            Administração
          </p>
          <h1
            className="mt-2 text-headline-medium font-semibold text-on-surface"
            id="simulation-classes-title"
          >
            Simulados por turma
          </h1>
          <p className="mt-2 max-w-3xl text-body-large leading-6 text-muted">
            Escolha uma turma para consultar os simulados e acompanhar seu ciclo.
          </p>
        </div>
        <div className="w-full space-y-2 sm:w-56">
          <label
            className="text-label-large font-medium text-on-surface"
            htmlFor="simulation-school-year-filter"
          >
            Ano letivo
          </label>
          <SelectField
            disabled={loading || Boolean(error)}
            id="simulation-school-year-filter"
            onChange={(event) => setSelectedSchoolYear(Number(event.currentTarget.value))}
            value={selectedSchoolYear}
          >
            {availableSchoolYears.map((schoolYear) => (
              <option key={schoolYear} value={schoolYear}>
                {schoolYear}
              </option>
            ))}
          </SelectField>
        </div>
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
      {!loading && !error && classes.length > 0 && visibleClasses.length === 0 && (
        <div className="panel-surface rounded-2xl bg-surface p-6">
          <p className="text-body-large text-on-surface">
            Nenhuma turma disponível para o ano letivo {selectedSchoolYear}.
          </p>
        </div>
      )}
      {!loading && !error && visibleClasses.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleClasses.map((schoolClass) => (
            <li
              className="panel-surface flex flex-col gap-4 rounded-2xl bg-surface p-5"
              key={schoolClass.classId}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-title-medium font-semibold text-on-surface">
                    {classLabel(schoolClass)}
                  </h2>
                </div>
                {schoolClass.isClosed && <Badge tone="warning">Fechada</Badge>}
              </div>
              <ActionLink
                className="px-4"
                to={`/admin/turmas/${encodeURIComponent(schoolClass.classId)}/simulados`}
              >
                {schoolClass.isClosed ? 'Consultar histórico' : 'Ver simulados'}
              </ActionLink>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
