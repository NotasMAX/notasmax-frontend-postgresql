import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router';
import { AuthProvider, useAuth } from '../auth/AuthContext';
import {
  clearSensitiveLinkTokenForFlow,
  sensitiveLinkFlowForPathname,
  type SensitiveLinkToken,
} from '../auth/sensitiveLink';
import { AppLayout } from '../components/AppLayout';
import { AdminHomePage } from '../routes/AdminHomePage';
import {
  AcademicClassDetailPage,
  AcademicClassFormPage,
  AcademicClassListPage,
  AcademicSubjectDetailPage,
  AcademicSubjectFormPage,
  AcademicSubjectListPage,
} from '../routes/adminAcademic/AcademicStructurePages';
import {
  AdminAccountDetailRoute,
  AdminAccountFormRoute,
  AdminAccountListRoute,
} from '../routes/adminAccounts/AccountRoutes';
import { LoginPage } from '../routes/LoginPage';
import { EnrollmentCreatePage } from '../routes/adminAcademic/EnrollmentCreatePage';
import { NotFoundPage } from '../routes/NotFoundPage';
import { PasswordActionPage } from '../routes/PasswordActionPage';
import { PasswordResetRequestPage } from '../routes/PasswordResetRequestPage';
import { developmentRoutes } from './developmentRoutes';

function RequireAdministrator() {
  const { state, retrySessionLookup } = useAuth();

  if (state.status === 'loading') {
    return (
      <main
        aria-live="polite"
        className="mx-auto max-w-xl px-4 py-16 text-center text-body-large text-on-surface"
        role="status"
      >
        Verificando sua sessão…
      </main>
    );
  }

  if (state.status === 'unavailable') {
    return (
      <main className="mx-auto max-w-xl space-y-5 px-4 py-16 text-center">
        <h1 className="text-headline-small font-semibold text-on-surface">
          Não foi possível verificar sua sessão
        </h1>
        <p className="text-body-large leading-6 text-muted">
          Confira sua conexão e tente novamente.
        </p>
        <button
          className="min-h-12 rounded-lg bg-primary px-6 text-label-large font-semibold text-on-primary hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          onClick={() => void retrySessionLookup()}
          type="button"
        >
          Tentar novamente
        </button>
      </main>
    );
  }

  if (state.status === 'forbidden') {
    return (
      <main className="mx-auto max-w-xl space-y-5 px-4 py-16 text-center">
        <h1 className="text-headline-small font-semibold text-on-surface">
          Acesso administrativo indisponível
        </h1>
        <p className="text-body-large leading-6 text-muted">
          Esta conta não tem acesso à área administrativa.
        </p>
        <Link
          className="inline-flex min-h-11 items-center rounded-lg px-3 text-label-large font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          to="/"
        >
          Voltar para entrar
        </Link>
      </main>
    );
  }

  if (state.status === 'anonymous') {
    return (
      <Navigate
        replace
        state={state.reason === 'expired' ? { sessionExpired: true } : null}
        to="/"
      />
    );
  }

  return <Outlet />;
}

interface AppProps {
  readonly initialSensitiveLink?: SensitiveLinkToken | null;
}

export function App({ initialSensitiveLink = null }: AppProps) {
  const [sensitiveLink, setSensitiveLink] = useState(initialSensitiveLink);

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes sensitiveLink={sensitiveLink} setSensitiveLink={setSensitiveLink} />
      </AuthProvider>
    </BrowserRouter>
  );
}

interface AppRoutesProps {
  readonly sensitiveLink: SensitiveLinkToken | null;
  readonly setSensitiveLink: Dispatch<SetStateAction<SensitiveLinkToken | null>>;
}

export function AppRoutes({ sensitiveLink, setSensitiveLink }: AppRoutesProps) {
  const location = useLocation();

  useEffect(() => {
    if (sensitiveLink && sensitiveLinkFlowForPathname(location.pathname) !== sensitiveLink.flow) {
      setSensitiveLink(null);
    }
  }, [location.pathname, sensitiveLink, setSensitiveLink]);

  function clearSensitiveToken(flow: SensitiveLinkToken['flow']) {
    setSensitiveLink((current) => clearSensitiveLinkTokenForFlow(current, flow));
  }

  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="recuperar-senha" element={<PasswordResetRequestPage />} />
      <Route
        path="redefinir-senha"
        element={
          <PasswordActionPage
            flow="password-reset"
            initialToken={sensitiveLink?.flow === 'password-reset' ? sensitiveLink.token : null}
            onTokenCleared={() => clearSensitiveToken('password-reset')}
          />
        }
      />
      <Route
        path="ativar-conta"
        element={
          <PasswordActionPage
            flow="activation"
            initialToken={sensitiveLink?.flow === 'activation' ? sensitiveLink.token : null}
            onTokenCleared={() => clearSensitiveToken('activation')}
          />
        }
      />
      <Route element={<RequireAdministrator />}>
        <Route element={<AppLayout />}>
          <Route path="admin" element={<AdminHomePage />} />
          <Route
            path="admin/estrutura"
            element={<Navigate to="/admin/estrutura/materias" replace />}
          />
          <Route path="admin/estrutura/materias" element={<AcademicSubjectListPage />} />
          <Route path="admin/estrutura/materias/nova" element={<AcademicSubjectFormPage />} />
          <Route
            path="admin/estrutura/materias/:subjectId/editar"
            element={<AcademicSubjectFormPage />}
          />
          <Route
            path="admin/estrutura/materias/:subjectId"
            element={<AcademicSubjectDetailPage />}
          />
          <Route path="admin/estrutura/turmas" element={<AcademicClassListPage />} />
          <Route path="admin/estrutura/turmas/nova" element={<AcademicClassFormPage />} />
          <Route
            path="admin/estrutura/turmas/:classId/editar"
            element={<AcademicClassFormPage />}
          />
          <Route path="admin/estrutura/turmas/:classId" element={<AcademicClassDetailPage />} />
          <Route path="admin/matriculas/nova" element={<EnrollmentCreatePage />} />
          <Route path="admin/contas" element={<Navigate to="/admin/contas/alunos" replace />} />
          <Route path="admin/contas/:profile" element={<AdminAccountListRoute />} />
          <Route path="admin/contas/:profile/novo" element={<AdminAccountFormRoute />} />
          <Route
            path="admin/contas/:profile/:accountId/editar"
            element={<AdminAccountFormRoute />}
          />
          <Route path="admin/contas/:profile/:accountId" element={<AdminAccountDetailRoute />} />
        </Route>
      </Route>

      {developmentRoutes}

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
