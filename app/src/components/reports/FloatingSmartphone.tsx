import { X } from "lucide-react";
import type { ReactNode } from "react";

type FloatingSmartphoneProps = {
  children: ReactNode;
  onClose?: () => void;
};

export function FloatingSmartphone({ children, onClose }: Readonly<FloatingSmartphoneProps>) {
  return (
    <div className="fixed bottom-4 left-4 z-50 w-[min(360px,calc(100vw-2rem))] md:bottom-6 md:left-6">
      <div className="h-[min(723px,calc(100vh-2rem))] rounded-[3.2rem] bg-gradient-to-b from-neutral-900 to-black p-[10px] shadow-[0_25px_60px_rgba(0,0,0,0.45)]">
        <div className="relative flex h-full flex-col">
          <div className="flex h-6 items-start justify-center">
            <div className="mt-1.5 h-1.5 w-20 rounded-full bg-neutral-600" />
          </div>

          {onClose && (
            <button
              type="button"
              title="Chiudi smartphone"
              className="absolute right-4 top-3 z-10 rounded-full bg-white/10 p-1.5 text-white transition-colors hover:bg-white/20"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <div className="min-h-0 flex-1 overflow-hidden rounded-[2.4rem] bg-white">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
