import React, { useEffect } from 'react';

export type Station = {
  id: string; name: string; client: string | null; model: string | null;
  inspection_date: string | null; last_ticket_date: string | null;
  technicians_in_range: string | null; technician: string | null;
  status: string; city: string | null; street: string | null; country: string | null;
  additional_info: string | null; lat?: number; lng?: number;
};

type StationPanelProps = { station: Station | null; onClose: () => void; };

const IconClose = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const IconInfo = () => <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const IconTicket = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 22H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8l8 8v10a2 2 0 0 1-2 2z"/><polyline points="14 2 14 10 22 10"/><line x1="9" x2="15" y1="15" y2="15"/><line x1="9" x2="11" y1="11" y2="11"/></svg>;

const getStatusColorClass = (status: string) => {
  switch(status) {
    case 'Awaria': return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]';
    case 'Uruchomienie': return 'bg-purple-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]';
    case 'Przegląd': return 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]';
    case 'Zlecenie jakościowe': return 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]';
    case 'Naprawa odpłatna': return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]';
    case 'Brak akcji': default: return 'bg-[#58b347] shadow-[0_0_8px_rgba(88,179,71,0.6)]';
  }
};

export default function StationPanel({ station, onClose }: StationPanelProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!station) return null;

  return (
    <div className="absolute top-0 right-0 h-full w-96 bg-white/95 backdrop-blur-xl shadow-2xl border-l border-slate-200 z-50 flex flex-col transform transition-transform duration-300">
      <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2.5 h-2.5 rounded-full ${getStatusColorClass(station.status)}`} />
            <h2 className="text-xl font-bold text-slate-800">{station.name}</h2>
          </div>
          <p className="text-sm text-slate-500 flex items-center gap-1.5">{station.city}, {station.street}</p>
        </div>
        <button onClick={onClose} className="p-2 bg-white rounded-full border border-slate-200 text-slate-400 hover:text-slate-600 shadow-sm transition-colors"><IconClose /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><IconInfo /> Operacyjne</h3>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
            <div className="flex justify-between items-center"><span className="text-xs text-slate-500">Klient</span><span className="text-sm font-semibold text-slate-800">{station.client || 'Brak danych'}</span></div>
            <div className="flex justify-between items-center"><span className="text-xs text-slate-500">Model stacji</span><span className="text-sm font-semibold text-slate-800">{station.model || 'Nieokreślony'}</span></div>
            <div className="flex justify-between items-center"><span className="text-xs text-slate-500">Główny opiekun</span><span className="text-sm font-semibold text-[#58b347]">{station.technician || 'Brak'}</span></div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><IconInfo /> Status zadania</h3>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Wymagana akcja</span>
              <span className="text-sm font-bold text-slate-800">{station.status}</span>
            </div>
            <div className="flex justify-between items-center"><span className="text-xs text-slate-500">Przegląd UDT/Serwis</span><span className="text-sm font-semibold text-slate-800">{station.inspection_date || 'Brak danych'}</span></div>
          </div>
        </div>

        {station.additional_info && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><IconInfo /> Notatki dla serwisu</h3>
            <div className="bg-yellow-50/50 rounded-xl p-4 border border-yellow-100 text-sm text-yellow-800">{station.additional_info}</div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-slate-100 bg-white">
        <button className="w-full bg-[#58b347] hover:bg-[#499b3a] text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-2" onClick={() => alert('Moduł tworzenia zgłoszeń w przygotowaniu.')}>
          <IconTicket /> Utwórz zgłoszenie do tego zadania
        </button>
      </div>
    </div>
  );
}