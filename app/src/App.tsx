import { Navigate, Routes, Route } from "react-router";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Dipendenti from "@/pages/Dipendenti";
import Formazione from "@/pages/Formazione";
import Sorveglianza from "@/pages/Sorveglianza";
import Mansioni from "@/pages/Mansioni";
import Scadenziario from "@/pages/Scadenziario";
import Documenti from "@/pages/Documenti";
import Impostazioni from "@/pages/Impostazioni";
import AuditLog from "@/pages/AuditLog";
import ImportExport from "@/pages/ImportExport";
import Microclima from "@/pages/Microclima";
import AnagraficheUtenti from "@/pages/AnagraficheUtenti";
import Login from "@/pages/Login";
import Segnalazioni from "@/pages/Segnalazioni";
import { SegnalatoreApp } from "@/components/reports/SegnalatoreApp/index";
import NotFound from "@/pages/NotFound";
import { useAuth } from "@/hooks/useAuth";
import {
  getProtectedRouteDecision,
  getPublicRouteDecision,
} from "@/lib/auth-routing";
import type { ModuleAccessId } from "@/lib/module-access";

function LayoutWrapper({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AppLayout>{children}</AppLayout>;
}

function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
        Caricamento sessione...
      </div>
    </div>
  );
}

function AccessDeniedScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md rounded-xl border border-red-200 bg-white px-6 py-5 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
          Accesso negato
        </p>
        <h1 className="mt-2 text-lg font-semibold text-slate-900">
          Funzione non autorizzata
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Il tuo ruolo non dispone dei permessi necessari per accedere a questa sezione.
        </p>
      </div>
    </div>
  );
}

function ProtectedRoute({
  children,
  withLayout = true,
  moduleId,
}: Readonly<{
  children: React.ReactNode;
  withLayout?: boolean;
  moduleId: ModuleAccessId;
}>) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const decision = getProtectedRouteDecision({
    isAuthenticated,
    isLoading,
    role: user?.role,
    permissions: user?.permissions,
    moduleId,
  });

  if (decision.state === "loading") {
    return <AuthLoadingScreen />;
  }

  if (decision.state === "redirect") {
    return <Navigate to={decision.to} replace />;
  }

  if (decision.state === "forbidden") {
    return withLayout ? (
      <LayoutWrapper>
        <AccessDeniedScreen />
      </LayoutWrapper>
    ) : (
      <AccessDeniedScreen />
    );
  }

  if (!withLayout) {
    return children;
  }

  return <LayoutWrapper>{children}</LayoutWrapper>;
}

function PublicRoute({ children }: Readonly<{ children: React.ReactNode }>) {
  const { isLoading, user } = useAuth();
  const decision = getPublicRouteDecision({
    isLoading,
    role: user?.role,
  });

  if (decision.state === "loading") {
    return <AuthLoadingScreen />;
  }

  if (decision.state === "redirect") {
    return <Navigate to={decision.to} replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route
        path="/"
        element={
          <ProtectedRoute moduleId="dashboard">
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/anagrafiche-utenti"
        element={
          <ProtectedRoute moduleId="adminIdentity">
            <AnagraficheUtenti />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dipendenti"
        element={
          <ProtectedRoute moduleId="workers">
            <Dipendenti />
          </ProtectedRoute>
        }
      />
      <Route
        path="/formazione"
        element={
          <ProtectedRoute moduleId="training">
            <Formazione />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sorveglianza"
        element={
          <ProtectedRoute moduleId="healthSurveillance">
            <Sorveglianza />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mansioni"
        element={
          <ProtectedRoute moduleId="jobRoles">
            <Mansioni />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scadenziario"
        element={
          <ProtectedRoute moduleId="deadlines">
            <Scadenziario />
          </ProtectedRoute>
        }
      />
      <Route
        path="/segnalazioni"
        element={
          <ProtectedRoute moduleId="reports">
            <Segnalazioni />
          </ProtectedRoute>
        }
      />
      <Route
        path="/segnalazioni/app"
        element={
          <ProtectedRoute moduleId="reportsSafetyApp" withLayout={false}>
            <SegnalatoreApp variant="page" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documenti"
        element={
          <ProtectedRoute moduleId="documents">
            <Documenti />
          </ProtectedRoute>
        }
      />
      <Route
        path="/impostazioni"
        element={
          <ProtectedRoute moduleId="settings">
            <Impostazioni />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit"
        element={
          <ProtectedRoute moduleId="audit">
            <AuditLog />
          </ProtectedRoute>
        }
      />
      <Route
        path="/import-export"
        element={
          <ProtectedRoute moduleId="importExport">
            <ImportExport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/microclima"
        element={
          <ProtectedRoute moduleId="microclima">
            <Microclima />
          </ProtectedRoute>
        }
      />
      <Route
        path="*"
        element={
          <ProtectedRoute moduleId="dashboard">
            <NotFound />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
