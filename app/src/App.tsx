import { Routes, Route } from "react-router";
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
import Login from "@/pages/Login";
import Segnalazioni from "@/pages/Segnalazioni";
import { SegnalatoreApp } from "@/components/reports/SegnalatoreApp";
import NotFound from "@/pages/NotFound";

function LayoutWrapper({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <LayoutWrapper>
            <Dashboard />
          </LayoutWrapper>
        }
      />
      <Route
        path="/dipendenti"
        element={
          <LayoutWrapper>
            <Dipendenti />
          </LayoutWrapper>
        }
      />
      <Route
        path="/formazione"
        element={
          <LayoutWrapper>
            <Formazione />
          </LayoutWrapper>
        }
      />
      <Route
        path="/sorveglianza"
        element={
          <LayoutWrapper>
            <Sorveglianza />
          </LayoutWrapper>
        }
      />
      <Route
        path="/mansioni"
        element={
          <LayoutWrapper>
            <Mansioni />
          </LayoutWrapper>
        }
      />
      <Route
        path="/scadenziario"
        element={
          <LayoutWrapper>
            <Scadenziario />
          </LayoutWrapper>
        }
      />
      <Route
        path="/segnalazioni"
        element={
          <LayoutWrapper>
            <Segnalazioni />
          </LayoutWrapper>
        }
      />
      <Route
        path="/segnalazioni/app"
        element={
          <LayoutWrapper>
            <SegnalatoreApp variant="page" />
          </LayoutWrapper>
        }
      />
      <Route
        path="/documenti"
        element={
          <LayoutWrapper>
            <Documenti />
          </LayoutWrapper>
        }
      />
      <Route
        path="/impostazioni"
        element={
          <LayoutWrapper>
            <Impostazioni />
          </LayoutWrapper>
        }
      />
      <Route
        path="/audit"
        element={
          <LayoutWrapper>
            <AuditLog />
          </LayoutWrapper>
        }
      />
      <Route
        path="/import-export"
        element={
          <LayoutWrapper>
            <ImportExport />
          </LayoutWrapper>
        }
      />
      <Route
        path="/microclima"
        element={
          <LayoutWrapper>
            <Microclima />
          </LayoutWrapper>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
