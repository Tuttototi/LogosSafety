import { cn } from "@/lib/utils";
import { subtitles } from "./mock";
import type { SegnalatoreRoleGroup } from "./types";

type HeaderProps = {
  isMobile: boolean;
  roleGroup: SegnalatoreRoleGroup;
  roleLabel: string;
};

export function Header({ isMobile, roleGroup, roleLabel }: Readonly<HeaderProps>) {
  return (
    <header className={cn("border-b border-slate-100 pb-4", isMobile ? "text-center" : "flex items-center justify-between gap-4")}>
      <div className={cn("min-w-0", isMobile && "flex flex-col items-center")}>
        <img src="/assets/LogoLogos.png" alt="Logos" className={cn("w-auto object-contain", isMobile ? "h-12" : "h-14")} />
        <div className={cn(isMobile ? "mt-3" : "mt-4")}>
          <h1 className={cn("font-semibold text-red-600", isMobile ? "text-xl" : "text-2xl")}>Segnalazioni</h1>
          <p className={cn("mt-1 text-slate-600", isMobile ? "text-xs leading-5" : "text-sm")}>
            {subtitles[roleGroup]}
          </p>
        </div>
      </div>
      {!isMobile && (
        <div className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
          Ruolo: {roleLabel}
        </div>
      )}
    </header>
  );
}
