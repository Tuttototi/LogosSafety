import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent, ReactNode } from "react";

type FloatingSmartphoneProps = {
  children: ReactNode;
  onClose?: () => void;
};

type Position = {
  x: number;
  y: number;
};

const INITIAL_OFFSET = 24;
const MIN_VISIBLE_SIZE = 96;

function clampPosition(position: Position): Position {
  const maxX = Math.max(0, window.innerWidth - MIN_VISIBLE_SIZE);
  const maxY = Math.max(0, window.innerHeight - MIN_VISIBLE_SIZE);

  return {
    x: Math.min(Math.max(position.x, 0), maxX),
    y: Math.min(Math.max(position.y, 0), maxY),
  };
}

export function FloatingSmartphone({ children, onClose }: Readonly<FloatingSmartphoneProps>) {
  const phoneRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const setInitialPosition = () => {
      const height = phoneRef.current?.offsetHeight ?? Math.min(723, window.innerHeight - INITIAL_OFFSET * 2);
      setPosition((current) =>
        current
          ? clampPosition(current)
          : clampPosition({
              x: INITIAL_OFFSET,
              y: window.innerHeight - height - INITIAL_OFFSET,
            }),
      );
    };

    setInitialPosition();
    window.addEventListener("resize", setInitialPosition);

    return () => window.removeEventListener("resize", setInitialPosition);
  }, []);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("input, textarea, select, button, label, a")) return;

    const rect = phoneRef.current?.getBoundingClientRect();
    if (!rect) return;

    setIsDragging(true);
    setDragOffset({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    setPosition(
      clampPosition({
        x: event.clientX - dragOffset.x,
        y: event.clientY - dragOffset.y,
      }),
    );
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div
      ref={phoneRef}
      className="fixed bottom-4 left-4 z-50 w-[min(360px,calc(100vw-2rem))] md:bottom-6 md:left-6"
      style={position ? { left: position.x, top: position.y, right: "auto", bottom: "auto", transform: "none" } : undefined}
    >
      <div className="h-[min(723px,calc(100vh-2rem))] rounded-[3.2rem] bg-gradient-to-b from-neutral-900 to-black p-[10px] shadow-[0_25px_60px_rgba(0,0,0,0.45)]">
        <div className="relative flex h-full flex-col">
          <div
            className={`flex h-6 touch-none items-start justify-center ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
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
