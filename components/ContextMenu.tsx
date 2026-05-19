import React, { useEffect } from 'react';

export type ContextMenuState = { x: number; y: number; lng: number; lat: number } | null;

type ContextMenuProps = {
  menu: ContextMenuState;
  onClose: () => void;
  onAddStation: (lat: number, lng: number) => void;
  onEditSector: () => void;
};

// Eleganckie ikony SVG
const IconAdd = () => (
  <svg className="w-4 h-4 text-slate-400 group-hover:text-[#58b347] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14"/>
    <path d="M5 12h14"/>
  </svg>
);

const IconZone = () => (
  <svg className="w-4 h-4 text-slate-400 group-hover:text-[#58b347] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
    <line x1="9" x2="9" y1="3" y2="18"/>
    <line x1="15" x2="15" y1="6" y2="21"/>
  </svg>
);

export default function ContextMenu({ menu, onClose, onAddStation, onEditSector }: ContextMenuProps) {
  
  // Zamykanie menu po wciśnięciu ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!menu) return null;

  return (
    <div
      className="absolute z-[200] w-64 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all"
      style={{ top: menu.y, left: menu.x }}
    >
      <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Akcje na mapie
        </span>
      </div>
      
      <div className="flex flex-col py-1.5">
        <button
          onClick={() => {
            onAddStation(menu.lat, menu.lng);
            onClose();
          }}
          className="group flex items-center gap-3 w-full px-4 py-2.5 text-left text-slate-700 hover:bg-green-50 hover:text-[#58b347] transition-colors"
        >
          <IconAdd />
          <span className="text-sm font-medium">Dodaj stację w tym miejscu</span>
        </button>
        
        <button
          onClick={() => {
            onEditSector();
            onClose();
          }}
          className="group flex items-center gap-3 w-full px-4 py-2.5 text-left text-slate-700 hover:bg-green-50 hover:text-[#58b347] transition-colors"
        >
          <IconZone />
          <span className="text-sm font-medium">Zarządzaj strefami techników</span>
        </button>
      </div>
    </div>
  );
}