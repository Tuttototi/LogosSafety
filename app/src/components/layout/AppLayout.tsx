import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Stethoscope,
  Briefcase,
  CalendarClock,
  FileText,
  Settings,
  Shield,
  Search,
  Bell,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldCheck,
  BookOpen,
  ClipboardCheck,
  FileSpreadsheet,
  Menu,
  Thermometer,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBranding } from "@/hooks/useBranding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { trpc } from "@/providers/trpc";
import { canAccessModule, type ModuleAccessId } from "@/lib/module-access";

type SidebarItem = {
  path: string;
  label: string;
  icon: LucideIcon;
  moduleId: ModuleAccessId;
  external?: boolean;
};

const navItems: SidebarItem[] = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, moduleId: "dashboard" },
  { path: "/dipendenti", label: "Dipendenti", icon: Users, moduleId: "workers" },
  { path: "/formazione", label: "Formazione", icon: GraduationCap, moduleId: "training" },
  { path: "/sorveglianza", label: "Sorveglianza Sanitaria", icon: Stethoscope, moduleId: "healthSurveillance" },
  { path: "/mansioni", label: "Mansioni", icon: Briefcase, moduleId: "jobRoles" },
  { path: "/scadenziario", label: "Scadenziario", icon: CalendarClock, moduleId: "deadlines" },
  { path: "/segnalazioni", label: "Segnalazioni", icon: FileText, moduleId: "reports" },
  { path: "/microclima", label: "Microclima", icon: Thermometer, moduleId: "microclima" },
  { path: "/documenti", label: "Documenti", icon: FileText, moduleId: "documents" },
  { path: "/impostazioni", label: "Impostazioni", icon: Settings, moduleId: "settings" },
  { path: "/anagrafiche-utenti", label: "Anagrafiche e Utenti", icon: UserCog, moduleId: "adminIdentity" },
  { path: "/audit", label: "Audit Log", icon: BookOpen, moduleId: "audit" },
  { path: "/import-export", label: "Import / Export", icon: FileSpreadsheet, moduleId: "importExport" },
];

const roleLabels: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  admin: { label: "Admin", icon: Shield, color: "bg-red-100 text-red-700" },
  rspp: { label: "RSPP", icon: ShieldCheck, color: "bg-blue-100 text-blue-700" },
  aspp: { label: "ASPP", icon: ShieldCheck, color: "bg-sky-100 text-sky-700" },
  responsabile_sicurezza: { label: "Resp. Sicurezza", icon: ShieldCheck, color: "bg-blue-100 text-blue-700" },
  operatore_sicurezza: { label: "Operatore H\u0026S", icon: ClipboardCheck, color: "bg-green-100 text-green-700" },
  capo_area: { label: "Capo Area", icon: Briefcase, color: "bg-indigo-100 text-indigo-700" },
  capo_impianto: { label: "Capo Impianto", icon: Briefcase, color: "bg-cyan-100 text-cyan-700" },
  medico_competente: { label: "Medico Competente", icon: Stethoscope, color: "bg-teal-100 text-teal-700" },
  referente_commessa: { label: "Referente Commessa", icon: Briefcase, color: "bg-purple-100 text-purple-700" },
  operatore: { label: "Operatore", icon: ClipboardCheck, color: "bg-slate-100 text-slate-700" },
  dipendente: { label: "Dipendente", icon: Users, color: "bg-slate-100 text-slate-700" },
  segnalatore: { label: "Segnalatore", icon: FileText, color: "bg-amber-100 text-amber-700" },
  auditor: { label: "Auditor", icon: BookOpen, color: "bg-orange-100 text-orange-700" },
  sola_lettura: { label: "Sola Lettura", icon: BookOpen, color: "bg-gray-100 text-gray-600" },
};

function SidebarNav(props: Readonly<{ collapsed: boolean; onNavigate?: () => void }>) {
  const { collapsed, onNavigate } = props;
  const location = useLocation();
  const { user } = useAuth();
  const { data: stats } = trpc.dashboard.stats.useQuery(undefined, { enabled: !!user });

  const items = useMemo(() => {
    return navItems.filter((item) => canAccessModule(user, item.moduleId));
  }, [user]);

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
      {items.map((item) => {
        const isActive = !item.external && location.pathname === item.path;
        const className = `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all ${
          isActive
            ? "bg-white/15 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
            : "text-white/90 hover:bg-white/10"
        }`;
        const content = (
          <>
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
            {!collapsed && item.path === "/scadenziario" && stats && stats.openAlerts > 0 && (
              <span className="ml-auto rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {stats.openAlerts}
              </span>
            )}
          </>
        );

        if (item.external) {
          return (
            <a
              key={item.path}
              href={item.path}
              title={collapsed ? item.label : undefined}
              onClick={onNavigate}
              className={className}
            >
              {content}
            </a>
          );
        }

        return (
          <Link
            key={item.path}
            to={item.path}
            title={collapsed ? item.label : undefined}
            onClick={onNavigate}
            className={className}
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AppLayout(props: Readonly<{ children: React.ReactNode }>) {
  const { children } = props;
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, logout } = useAuth();
  const { branding } = useBranding();

  const { data: stats } = trpc.dashboard.stats.useQuery(undefined, { enabled: !!user });

  const appName = branding?.appName ?? "Logos Safety";
  const sidebarLogoUrl = "/assets/LogoLogos.png";
  const roleInfo = user ? roleLabels[user.role] ?? roleLabels.sola_lettura : null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside
        className={`fixed left-0 top-0 z-40 hidden h-full flex-col border-r border-white/10 bg-[#b91c1c] transition-all duration-200 md:flex ${collapsed ? "w-[72px]" : "w-[256px]"}`}
      >
        <div className="flex h-[72px] items-center border-b border-white/10 px-3 py-2">
          <div className="flex h-full w-full min-w-0 items-center justify-center rounded-xl bg-white px-3">
            <div className="flex w-full items-center justify-center">
              <img
                src={sidebarLogoUrl}
                alt={appName}
                className={`max-h-12 w-auto object-contain ${collapsed ? "max-w-full" : "max-w-[190px]"}`}
              />
            </div>
          </div>
        </div>

        <SidebarNav collapsed={collapsed} />

        <div className="border-t border-white/10 p-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center rounded-xl p-2 text-white transition-colors hover:bg-white/10"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0 bg-[#b91c1c]">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu navigazione</SheetTitle>
            <SheetDescription>Navigazione principale dell&apos;app</SheetDescription>
          </SheetHeader>
          <div className="flex h-full flex-col">
            <div className="flex h-[72px] items-center border-b border-white/10 px-3 py-2 text-white">
              <div className="flex h-full w-full min-w-0 items-center justify-center rounded-xl bg-white px-3">
                <div className="flex w-full items-center justify-center">
                  <img
                    src={sidebarLogoUrl}
                    alt={appName}
                    className="max-h-12 w-auto max-w-[190px] object-contain"
                  />
                </div>
              </div>
            </div>
            <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className={cn("flex flex-1 flex-col transition-all duration-200", collapsed ? "md:ml-18" : "md:ml-64")}>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button variant="ghost" size="icon" className="shrink-0 md:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
              <span className="sr-only">Apri menu</span>
            </Button>
            <div className="relative w-full max-w-[220px] sm:max-w-xs md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Cerca..."
                className="h-9 w-full border-slate-200 pl-9 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="ml-3 flex items-center gap-2 md:gap-3">
            <button className="relative rounded-full p-2 text-slate-600 transition-colors hover:bg-slate-100">
              <Bell className="h-5 w-5" />
              {stats && stats.criticalAlerts > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />}
            </button>

            <div className="flex items-center gap-2 md:gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-slate-900">{user?.name ?? "Utente"}</p>
                <div className="mt-0.5 flex items-center justify-end gap-1">
                  {roleInfo && <Badge variant="outline" className={`px-1.5 py-0 text-[10px] ${roleInfo.color}`}>{roleInfo.label}</Badge>}
                </div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#b91c1c] text-sm font-semibold text-white">
                {user?.name ? user.name.split(" ").map((n) => n[0]).join("") : "?"}
              </div>
              <Button variant="ghost" size="icon" className="hidden md:flex text-slate-500" onClick={logout} title="Logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
