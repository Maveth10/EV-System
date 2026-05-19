import React from 'react';

export type ContextMenuState = {
  x: number;
  y: number;
  lng: number;
  lat: number;
} | null;

type ContextMenuProps = {
  menu: ContextMenuState;
  onClose: () => void;
  onAddStation: (lat: number, lng: number) => void;
  onEditSector: () => void;
};

export default function ContextMenu({
  menu,
  onClose,
  onAddStation,
  onEditSector,
}: ContextMenuProps) {
  if (!menu) return null;

  return (
    <div
      className="absolute z-50 bg-white border border-slate-200 shadow-2xl rounded-xl w-64 overflow-hidden transform -translate-y-2"
      style={{ left: menu.x, top: menu.y }}
    >
      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Opcje obszaru
        </span>
        <span className="text-[10px] text-slate-400 font-mono">
          {menu.lat.toFixed(2)}, {menu.lng.toFixed(2)}
        </span>
      </div>

      <div className="flex flex-col py-1">
        <button
          className="text-left px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-3"
          onClick={() => {
            onAddStation(menu.lat, menu.lng);
            onClose();
          }}
        >
          <span className="text-lg">📍</span> Dodaj nową stację
        </button>

        <button
          className="text-left px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-3"
          onClick={() => {
            onEditSector();
            onClose();
          }}
        >
          <span className="text-lg">🗺️</span> Edytuj zasięg technika
        </button>
      </div>
    </div>
  );
}
