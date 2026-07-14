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

function ProtectedRoute({
  children,
  withLayout = true,
}: Readonly<{ children: React.ReactNode; withLayout?: boolean }>) {
  const { isAuthenticated, isLoading } = useAuth();
  const decision = getProtectedRouteDecision({ isAuthenticated, isLoading });

  if (decision.state === "loading") {
    return <AuthLoadingScreen />;
  }

  if (decision.state === "redirect") {
    return <Navigate to={decision.to} replace />;
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
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/anagrafiche-utenti"
        element={
          <ProtectedRoute>
            <AnagraficheUtenti />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dipendenti"
        element={
          <ProtectedRoute>
            <Dipendenti />
          </ProtectedRoute>
        }
      />
      <Route
        path="/formazione"
        element={
          <ProtectedRoute>
            <Formazione />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sorveglianza"
        element={
          <ProtectedRoute>
            <Sorveglianza />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mansioni"
        element={
          <ProtectedRoute>
            <Mansioni />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scadenziario"
        element={
          <ProtectedRoute>
            <Scadenziario />
          </ProtectedRoute>
        }
      />
      <Route
        path="/segnalazioni"
        element={
          <ProtectedRoute>
            <Segnalazioni />
          </ProtectedRoute>
        }
      />
      <Route
        path="/segnalazioni/app"
        element={
          <ProtectedRoute withLayout={false}>
            <SegnalatoreApp variant="page" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documenti"
        element={
          <ProtectedRoute>
            <Documenti />
          </ProtectedRoute>
        }
      />
      <Route
        path="/impostazioni"
        element={
          <ProtectedRoute>
            <Impostazioni />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit"
        element={
          <ProtectedRoute>
            <AuditLog />
          </ProtectedRoute>
        }
      />
      <Route
        path="/import-export"
        element={
          <ProtectedRoute>
            <ImportExport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/microclima"
        element={
          <ProtectedRoute>
            <Microclima />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<ProtectedRoute><NotFound /></ProtectedRoute>} />
    </Routes>
  );
}
